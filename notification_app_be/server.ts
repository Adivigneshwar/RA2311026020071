import express, { Express, Request, Response } from "express";
import cors from "cors";

interface Notification {
  id: string;
  type: "Placement" | "Result" | "Event";
  message: string;
  timestamp: string;
}

interface AuthRequest {
  email?: string;
  name?: string;
  rollNo?: string;
  accessCode?: string;
  clientID?: string;
  clientSecret?: string;
}

interface LogRequest {
  stack?: string;
  level?: string;
  package?: string;
  message?: string;
  timestamp?: string;
  meta?: Record<string, unknown>;
}

interface AuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface LogResponse {
  success: boolean;
  receivedAt: string;
}

interface QueryParams {
  limit?: string;
  page?: string;
  type?: string;
  notification_type?: string;
  priority?: string;
}

const app: Express = express();
const PORT: string | number = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const demoNotifications: Notification[] = [
  {
    id: "placement-1001",
    type: "Placement",
    message: "Campus recruitment drive registrations are now open.",
    timestamp: "2026-05-02T09:30:00Z",
  },
  {
    id: "result-1002",
    type: "Result",
    message: "Midterm results have been published to the student portal.",
    timestamp: "2026-05-02T08:40:00Z",
  },
  {
    id: "event-1003",
    type: "Event",
    message: "Guest lecture on cloud engineering starts at 3 PM today.",
    timestamp: "2026-05-01T15:00:00Z",
  },
  {
    id: "placement-1004",
    type: "Placement",
    message: "Interview shortlist released for the internship cohort.",
    timestamp: "2026-05-02T11:10:00Z",
  },
  {
    id: "result-1005",
    type: "Result",
    message: "Library exam schedule updated for final-year students.",
    timestamp: "2026-05-01T18:20:00Z",
  },
  {
    id: "event-1006",
    type: "Event",
    message: "Hackathon registration closes tomorrow evening.",
    timestamp: "2026-05-01T10:15:00Z",
  },
  {
    id: "placement-1007",
    type: "Placement",
    message: "New aptitude test preparation session added this Friday.",
    timestamp: "2026-05-02T12:05:00Z",
  },
  {
    id: "result-1008",
    type: "Result",
    message: "Semester marks verification window opens at noon.",
    timestamp: "2026-05-02T07:25:00Z",
  },
  {
    id: "event-1009",
    type: "Event",
    message: "Department seminar poster is now available on the notice board.",
    timestamp: "2026-05-01T13:50:00Z",
  },
  {
    id: "event-1010",
    type: "Event",
    message: "Student council election briefing session starts in auditorium B.",
    timestamp: "2026-05-02T06:45:00Z",
  },
  {
    id: "placement-1011",
    type: "Placement",
    message: "Final round interview slots are now visible in the portal.",
    timestamp: "2026-05-02T13:00:00Z",
  },
  {
    id: "result-1012",
    type: "Result",
    message: "Assignment grading has been completed for Data Structures.",
    timestamp: "2026-05-01T20:10:00Z",
  },
];

interface ValidUser {
  email: string;
  name: string;
  rollNo: string;
  accessCode: string;
  clientID: string;
  clientSecret: string;
}

const validUser: ValidUser = {
  email: "student@example.com",
  name: "Campus Student",
  rollNo: "RA2311026020071",
  accessCode: "ACCESS-2026",
  clientID: "campus-client",
  clientSecret: "campus-secret",
};

interface PriorityScoreMap {
  [key: string]: number;
}

function createToken(seed: string = "token"): string {
  const randomSuffix: string = Math.random().toString(36).slice(2, 10);
  return `${seed}-${randomSuffix}`;
}

function pickPriorityNotifications(limit: number): Notification[] {
  const priorityScore: PriorityScoreMap = {
    Placement: 3,
    Result: 2,
    Event: 1,
  };

  return [...demoNotifications]
    .sort((left, right) => {
      const leftScore: number = priorityScore[left.type] || 0;
      const rightScore: number = priorityScore[right.type] || 0;

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
    })
    .slice(0, limit);
}

app.get("/health", (request: Request, response: Response) => {
  response.json({ ok: true, service: "notification_app_be" });
});

app.post("/evaluation-service/auth", (request: Request, response: Response) => {
  const payload: AuthRequest = request.body || {};
  const requiredFields: (keyof AuthRequest)[] = [
    "email",
    "name",
    "rollNo",
    "accessCode",
    "clientID",
    "clientSecret",
  ];
  const missingField = requiredFields.find(
    (field) => !payload[field] || String(payload[field]).trim().length === 0
  );

  if (missingField) {
    return response.status(400).json({ message: `Missing required field: ${missingField}` });
  }

  if (
    payload.email !== validUser.email ||
    payload.name !== validUser.name ||
    payload.rollNo !== validUser.rollNo ||
    payload.accessCode !== validUser.accessCode ||
    payload.clientID !== validUser.clientID ||
    payload.clientSecret !== validUser.clientSecret
  ) {
    return response.status(401).json({ message: "Invalid authentication details" });
  }

  const authResponse: AuthResponse = {
    access_token: createToken("access"),
    expires_in: 3600,
    token_type: "Bearer",
  };

  return response.json(authResponse);
});

app.post("/evaluation-service/logs", (request: Request, response: Response) => {
  const authorizationHeader: string = request.headers.authorization || "";
  if (!authorizationHeader.startsWith("Bearer ")) {
    return response.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const payload: LogRequest = request.body || {};
  const requiredFields: (keyof LogRequest)[] = ["stack", "level", "package", "message", "timestamp"];
  const missingField = requiredFields.find((field) => !payload[field]);
  if (missingField) {
    return response.status(400).json({ message: `Missing log field: ${missingField}` });
  }

  const logResponse: LogResponse = {
    success: true,
    receivedAt: new Date().toISOString(),
  };

  return response.json(logResponse);
});

app.get("/evaluation-service/notifications", (request: Request, response: Response) => {
  const queryParams = request.query as QueryParams;
  const limit: number = Number.parseInt(queryParams.limit || "10", 10);
  const page: number = Number.parseInt(queryParams.page || "1", 10);
  const notificationType: string | null = queryParams.type || queryParams.notification_type || null;
  const priorityMode: boolean = String(queryParams.priority || "false").toLowerCase() === "true";

  let items: Notification[] = [...demoNotifications];

  if (notificationType) {
    items = items.filter((item) => item.type === notificationType);
  }

  if (priorityMode) {
    items = pickPriorityNotifications(Number.isNaN(limit) ? 10 : limit);
  } else {
    items = items.sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    );
  }

  const safeLimit: number = Number.isNaN(limit) || limit <= 0 ? 10 : limit;
  const safePage: number = Number.isNaN(page) || page <= 0 ? 1 : page;
  const startIndex: number = (safePage - 1) * safeLimit;
  const pagedItems: Notification[] = items.slice(startIndex, startIndex + safeLimit);

  return response.json(pagedItems);
});

app.use((request: Request, response: Response) => {
  response.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  // no logging per requirement; server starts silently
});
