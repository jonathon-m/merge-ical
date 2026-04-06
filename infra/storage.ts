export const table = new sst.aws.Dynamo("CalendarGroups", {
  fields: {
    shareSecret: "string",
  },
  primaryIndex: { hashKey: "shareSecret" },
});

export const bucket = new sst.aws.Bucket("MergedCalendars");
