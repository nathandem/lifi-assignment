// possible to use logger library as well

import { randomUUID } from "node:crypto";

let _requestId: string;

const generateAndAttachRequestId = () => {
  _requestId = randomUUID();
};

// Potential optimisation, depending on execution environment,
// re-use requestId when comes from a retry event
// const setRequestId = (
//   newRequestId: string,
//   event: { initialRequestId?: string }
// ) => {
//   _requestId = !!event.initialRequestId ? event.initialRequestId : newRequestId;
// };

const getRequestId = (): string => {
  return _requestId;
};

enum LogLevel {
  debug = "debug",
  verbose = "verbose",
  info = "info",
  warning = "warning",
  error = "error",
  alarm = "alarm",
}

type BaseLog = {
  level: LogLevel;
  time: string;
  requestId: string;
  message: string;
};
const getBaseLog = (level: LogLevel, msg: string) => ({
  level: level,
  time: new Date().toISOString(),
  requestId: _requestId,
  message: msg,
});

type FormattedNonErrorLog = BaseLog & { data: any };
const formatAndEmitNonErrorLog = (level: LogLevel, msg: string, data: any) => {
  const baseLog = getBaseLog(level, msg);
  const log: FormattedNonErrorLog = { ...baseLog, data: data };

  console.log(log);
};

type FormattedErrorLog = BaseLog & { error: any };
const formatAndEmitErrorLog = async (
  level: LogLevel,
  msg: string,
  error: any
) => {
  const baseLog = getBaseLog(level, msg);
  const errorLog: FormattedErrorLog = { ...baseLog, error: error };

  // if (env.sendEmail) await sendEmailNotif(errorLog);
  // Possible to also send some other types of alarm (Slack, etc) or
  // this alerting can be decided/triggered by a monitoring platform (Grafana, etc).
  // To be decided based on where and how the service is to be run.

  // stderr possible if more relevant for execution environment
  console.log(errorLog);
};

const logger = {
  debug: (msg: string, data: any = "") => {
    formatAndEmitNonErrorLog(LogLevel.debug, msg, data);
  },
  verbose: (msg: string, data: any = "") => {
    formatAndEmitNonErrorLog(LogLevel.verbose, msg, data);
  },
  info: (msg: string, data: any = "") => {
    formatAndEmitNonErrorLog(LogLevel.info, msg, data);
  },
  warning: async (msg: string, data: any = "") => {
    formatAndEmitNonErrorLog(LogLevel.warning, msg, data);
  },
  error: async (msg: string, error: any) => {
    await formatAndEmitErrorLog(LogLevel.error, msg, error);
  },
  alarm: async (msg: string, error: any) => {
    await formatAndEmitErrorLog(LogLevel.alarm, msg, error);
  },
};

export {
  logger,
  generateAndAttachRequestId,
  getRequestId,
  type FormattedNonErrorLog,
  type FormattedErrorLog,
};
