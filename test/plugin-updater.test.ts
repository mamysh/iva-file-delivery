import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import {
  PluginUpdater,
  type UpdaterOperations,
} from "../update/plugin-updater.ts";

const OLD = "1".repeat(40);
const NEW = "2".repeat(40);
const OLD_VERSION = "0.1.1";
const NEW_VERSION = "0.2.0";

type TestCall = {
  readonly command: string;
  readonly args: readonly string[];
  readonly environment?: Readonly<Record<string, string>>;
};

async function world(
  t: TestContext,
  source = "mamysh/iva-file-delivery/plugin@stable",
) {
  const home = await mkdtemp(join(tmpdir(), "iva-file-delivery-updater-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  const data = join(home, "data");
  const root = join(data, "custom", "plugins", "file-delivery");
  const pluginData = join(data, "plugin-data", "file-delivery");
  await mkdir(root, { recursive: true });
  await mkdir(pluginData, { recursive: true });
  await writeFile(join(root, "update-worker.mjs"), "// worker\n");
  await writeFile(
    join(root, "plugin.json"),
    JSON.stringify({ name: "file-delivery", version: OLD_VERSION }),
  );
  await writeFile(
    join(data, "custom", "plugins.json"),
    JSON.stringify({
      plugins: [
        {
          name: "file-delivery",
          source,
          ref: source.startsWith("/") ? "" : "stable",
          sha: source.startsWith("/") ? "" : OLD,
          enabled: true,
          trusted: true,
        },
      ],
    }),
  );
  return { data, root, pluginData };
}

function operations(
  calls: TestCall[],
  remote = NEW,
  fetches: string[] = [],
): Partial<UpdaterOperations> {
  return {
    now: () => new Date("2026-09-19T12:00:00.000Z"),
    token: () => "ABC123ABC123ABC123ABC123",
    exec: async (command, args, environment) => {
      calls.push({ command, args, ...(environment ? { environment } : {}) });
      return command === "git"
        ? { stdout: `${remote}\tstable\n`, stderr: "" }
        : { stdout: "Running as unit test.service\n", stderr: "" };
    },
    fetch: async (input) => {
      const url = String(input);
      fetches.push(url);
      return url.endsWith("/CHANGELOG.md")
        ? new Response(
            [
              "# Changelog",
              "## 0.2.0 — 2026-09-19",
              "- Новая отправка файлов.",
              "- Проверка обновлений в чате.",
              "## 0.1.2 — 2026-09-18",
              "- Исправлена отправка одного файла.",
              "## 0.1.1 — 2026-09-18",
              "- Старое изменение.",
            ].join("\n"),
            { status: 200, headers: { "content-type": "text/plain" } },
          )
        : url.startsWith("https://raw.githubusercontent.com/")
        ? new Response(
            JSON.stringify({ name: "file-delivery", version: NEW_VERSION }),
            { status: 200, headers: { "content-type": "application/json" } },
          )
        : new Response(
            JSON.stringify({
              workflow_runs: [{ status: "completed", conclusion: "success" }],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
    },
  };
}

test("check binds a higher stable release to a button approval offer", async (t) => {
  const paths = await world(t);
  const calls: TestCall[] = [];
  const fetches: string[] = [];
  const updater = new PluginUpdater(
    { PLUGIN_ROOT: paths.root, PLUGIN_DATA: paths.pluginData },
    operations(calls, NEW, fetches),
  );
  const result = (await updater.check()) as Record<string, unknown>;

  assert.equal(result.state, "available");
  assert.equal(result.currentSha, OLD);
  assert.equal(result.candidateSha, NEW);
  assert.equal(result.currentVersion, OLD_VERSION);
  assert.equal(result.candidateVersion, NEW_VERSION);
  assert.deepEqual(result.changes, [
    "• Новая отправка файлов.",
    "• Проверка обновлений в чате.",
    "• Исправлена отправка одного файла.",
  ]);
  assert.equal(result.approvalToken, "ABC123ABC123ABC123ABC123");
  assert.deepEqual(result.approvalPrompt, {
    prompt: [
      "⬆️ Доступно обновление плагина доставки файлов",
      "",
      `v${OLD_VERSION} → v${NEW_VERSION}`,
      "Источник: mamysh/iva-file-delivery/plugin @stable",
      "CI: success ✅",
      "",
      "Что изменится:",
      "• Новая отправка файлов.",
      "• Проверка обновлений в чате.",
      "• Исправлена отправка одного файла.",
      "",
      "Настройки и локальные данные будут сохранены.",
    ].join("\n"),
    options: [
      { id: "update", label: "⬆️ Обновить" },
      { id: "later", label: "Позже" },
    ],
    allowFreeform: false,
  });
  assert.deepEqual(calls[0], {
    command: "git",
    args: [
      "ls-remote",
      "--",
      "https://github.com/mamysh/iva-file-delivery.git",
      "stable",
      "stable^{}",
    ],
  });
  assert.deepEqual(fetches, [
    `https://raw.githubusercontent.com/mamysh/iva-file-delivery/${NEW}/plugin/plugin.json`,
    `https://api.github.com/repos/mamysh/iva-file-delivery/actions/runs?head_sha=${NEW}&per_page=20`,
    `https://raw.githubusercontent.com/mamysh/iva-file-delivery/${NEW}/CHANGELOG.md`,
  ]);
});

test("missing changelog keeps an exact-version link in the approval card", async (t) => {
  const paths = await world(t);
  const base = operations([]);
  const updater = new PluginUpdater(
    { PLUGIN_ROOT: paths.root, PLUGIN_DATA: paths.pluginData },
    {
      ...base,
      fetch: async (input, init) =>
        String(input).endsWith("/CHANGELOG.md")
          ? new Response("missing", { status: 404 })
          : base.fetch!(input, init),
    },
  );
  const result = (await updater.check()) as Record<string, unknown>;
  assert.deepEqual(result.changes, [
    `Список изменений: https://github.com/mamysh/iva-file-delivery/blob/${NEW}/CHANGELOG.md`,
  ]);
});

test("check refuses local sources and treats the installed SHA as current", async (t) => {
  const local = await world(t, "./local-plugin");
  const localResult = (await new PluginUpdater(
    { PLUGIN_ROOT: local.root, PLUGIN_DATA: local.pluginData },
    operations([]),
  ).check()) as Record<string, unknown>;
  assert.equal(localResult.ok, false);
  assert.equal(localResult.state, "local_source");

  const current = await world(t);
  const currentResult = (await new PluginUpdater(
    { PLUGIN_ROOT: current.root, PLUGIN_DATA: current.pluginData },
    operations([], OLD),
  ).check()) as Record<string, unknown>;
  assert.equal(currentResult.state, "current");
  assert.equal("approvalToken" in currentResult, false);
});

test("failed CI cannot create or retain an approval offer", async (t) => {
  const paths = await world(t);
  const base = operations([]);
  const updater = new PluginUpdater(
    { PLUGIN_ROOT: paths.root, PLUGIN_DATA: paths.pluginData },
    {
      ...base,
      fetch: async (input) =>
        String(input).startsWith("https://raw.githubusercontent.com/")
          ? new Response(
              JSON.stringify({ name: "file-delivery", version: NEW_VERSION }),
            )
          : new Response(
              JSON.stringify({
                workflow_runs: [
                  { status: "completed", conclusion: "failure" },
                ],
              }),
            ),
    },
  );
  const result = (await updater.check()) as Record<string, unknown>;
  assert.equal(result.state, "blocked");
  assert.equal(result.ci, "failure");
  assert.equal("approvalToken" in result, false);
  await assert.rejects(
    updater.apply({
      candidateSha: NEW,
      approvalToken: "ABC123ABC123ABC123ABC123",
    }),
    /UPDATE_CHECK_REQUIRED/u,
  );
});

test("apply starts only the exact fresh offer in a transient user unit", async (t) => {
  const paths = await world(t);
  const calls: TestCall[] = [];
  const updater = new PluginUpdater(
    { PLUGIN_ROOT: paths.root, PLUGIN_DATA: paths.pluginData },
    operations(calls),
  );
  await updater.check();
  await assert.rejects(
    updater.apply({ candidateSha: NEW, approvalToken: "0".repeat(24) }),
    /UPDATE_APPROVAL_MISMATCH/u,
  );
  const result = (await updater.apply({
    candidateSha: NEW,
    approvalToken: "ABC123ABC123ABC123ABC123",
  })) as Record<string, unknown>;
  assert.equal(result.state, "started");

  const launch = calls.at(-1)!;
  assert.equal(launch.command, "systemd-run");
  assert.deepEqual(launch.args.slice(0, 3), ["--user", "--collect", "--no-block"]);
  assert.ok(launch.args.some((arg) => arg.startsWith("--unit=iva-file-delivery-update-")));
  assert.equal(launch.environment?.XDG_RUNTIME_DIR?.startsWith("/run/user/"), true);
  assert.equal(
    launch.environment?.DBUS_SESSION_BUS_ADDRESS?.startsWith("unix:path="),
    true,
  );

  const jobs = join(paths.pluginData, "update-jobs");
  const [jobName] = await import("node:fs/promises").then(({ readdir }) => readdir(jobs));
  const jobPath = join(jobs, jobName!);
  const job = JSON.parse(await readFile(jobPath, "utf8"));
  assert.equal(job.pluginName, "file-delivery");
  assert.equal(job.previousSha, OLD);
  assert.equal(job.expectedSha, NEW);
  assert.equal(job.sourceBase, "mamysh/iva-file-delivery/plugin");
  assert.equal((await stat(jobPath)).mode & 0o777, 0o600);
  assert.equal((await stat(join(paths.pluginData, "update.lock"))).mode & 0o777, 0o600);
});

test("apply rechecks the moving ref and CI after approval", async (t) => {
  const paths = await world(t);
  const calls: TestCall[] = [];
  let remote = NEW;
  const base = operations(calls);
  const updater = new PluginUpdater(
    { PLUGIN_ROOT: paths.root, PLUGIN_DATA: paths.pluginData },
    {
      ...base,
      exec: async (command, args, environment) => {
        calls.push({ command, args, ...(environment ? { environment } : {}) });
        return command === "git"
          ? { stdout: `${remote}\tstable\n`, stderr: "" }
          : { stdout: "ok\n", stderr: "" };
      },
    },
  );
  await updater.check();
  remote = "3".repeat(40);
  await assert.rejects(
    updater.apply({
      candidateSha: NEW,
      approvalToken: "ABC123ABC123ABC123ABC123",
    }),
    /REMOTE_CHANGED_SINCE_CHECK/u,
  );
});

test("status returns only bounded job fields and detects superseded state", async (t) => {
  const paths = await world(t);
  const jobs = join(paths.pluginData, "update-jobs");
  await mkdir(jobs, { recursive: true });
  await writeFile(
    join(jobs, "001.json"),
    JSON.stringify({
      id: "001",
      status: "succeeded",
      installedSha: NEW,
      installedVersion: NEW_VERSION,
      expectedVersion: NEW_VERSION,
      secret: "must-not-return",
    }),
  );
  const result = (await new PluginUpdater(
    { PLUGIN_ROOT: paths.root, PLUGIN_DATA: paths.pluginData },
    operations([]),
  ).status()) as Record<string, unknown>;
  assert.equal(result.status, "superseded");
  assert.equal(result.currentSha, OLD);
  assert.equal("secret" in result, false);
});
