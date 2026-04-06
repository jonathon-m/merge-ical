import { table, bucket } from "./storage";

export const api = new sst.aws.ApiGatewayV2("Api", {
  domain: "api.mergical.link",
  cors: {
    allowOrigins: ["*"],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  },
  transform: {
    stage: {
      defaultRouteSettings: {
        // 20 req/s steady-state, burst up to 50
        throttlingRateLimit: 20,
        throttlingBurstLimit: 50,
      },
    },
  },
});

api.route("POST /groups", {
  handler: "packages/functions/src/groups.createGroupHandler",
  link: [table],
});

api.route("GET /groups/{shareSecret}", {
  handler: "packages/functions/src/groups.getGroupHandler",
  link: [table],
});

api.route("POST /groups/{shareSecret}/feeds", {
  handler: "packages/functions/src/groups.addFeedHandler",
  link: [table, bucket],
});

api.route("DELETE /groups/{shareSecret}/feeds/{feedIndex}", {
  handler: "packages/functions/src/groups.removeFeedHandler",
  link: [table, bucket],
});

api.route("GET /cal/{shareSecret}/merged.ics", {
  handler: "packages/functions/src/calendar.getMergedCalendarHandler",
  link: [table, bucket],
  timeout: "30 seconds",
});
