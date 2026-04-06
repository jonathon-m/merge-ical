import { table, bucket } from "./storage";

new sst.aws.Cron("RefreshCalendars", {
  schedule: "rate(1 hour)",
  job: {
    handler: "packages/functions/src/refresh.refreshHandler",
    link: [table, bucket],
    timeout: "5 minutes",
  },
});
