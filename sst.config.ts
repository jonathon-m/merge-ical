/// <reference path=".sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "merge-ical",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    await import("./infra/storage");
    const { api } = await import("./infra/api");
    const { web } = await import("./infra/web");
    await import("./infra/cron");

    return {
      api: api.url,
      web: web.url,
    };
  },
});
