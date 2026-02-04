const startedAt = Date.now();

let http5xx = 0;

function incHttp5xx() {
  http5xx += 1;
}

function snapshotRuntime({ appVersion }) {
  const now = Date.now();
  const uptimeSeconds = Math.floor((now - startedAt) / 1000);

  return {
    uptimeSeconds,
    http5xx,
    version: appVersion || "unknown",
  };
}

module.exports = {
  incHttp5xx,
  snapshotRuntime,
};

