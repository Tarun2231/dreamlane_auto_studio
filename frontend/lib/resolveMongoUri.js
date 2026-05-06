function getMongoUris() {
  const primary = process.env.MONGO_URI;
  const local = process.env.LOCAL_MONGO_URI || "mongodb://127.0.0.1:27017/car_service";
  const isDev = process.env.NODE_ENV === "development";
  const primaryIsAtlas = Boolean(primary) && primary.startsWith("mongodb+srv://");
  const preferLocal = process.env.PREFER_LOCAL_MONGO !== "false";

  const ordered = [];
  if (isDev && preferLocal && primaryIsAtlas && local) {
    ordered.push(local);
    if (primary && primary !== local) ordered.push(primary);
  } else {
    if (primary) ordered.push(primary);
    if (isDev && local && local !== primary) ordered.push(local);
  }

  return {
    primary,
    local,
    ordered,
  };
}

module.exports = getMongoUris;
