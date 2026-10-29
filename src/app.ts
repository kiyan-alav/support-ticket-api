import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import pg from "pg";

const { Pool } = pg;
const ticketColumns =
  'id, title, description, status, created_at AS "createdAt"';

const pool = new Pool();

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

const app: Express = express();

app.use(express.json());

const isValidParam = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const id = req.params.id;

  const numericId = Number(id);
  // ticket.id uses PostgreSQL INTEGER (SERIAL).
  const invalidParam =
    !Number.isInteger(numericId) || numericId <= 0 || numericId > 2_147_483_647;

  if (invalidParam) {
    return res.status(400).json({
      message: "Invalid param",
      data: null,
    });
  }

  return next();
};

const isValidBody = async (req: Request, res: Response, next: NextFunction) => {
  const body = req.body;

  const invalidBody =
    body === null || typeof body !== "object" || Array.isArray(body);

  if (invalidBody) {
    return res.status(400).json({
      message: "Invalid body",
      data: null,
    });
  }

  return next();
};

app.get("/health", async (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/tickets", async (req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT ${ticketColumns} FROM ticket ORDER BY id ASC`,
  );
  res.status(200).json(result.rows);
});

app.get("/tickets/:id", isValidParam, async (req: Request, res: Response) => {
  const { id } = req.params;

  console.log(req.params);
  console.log(req.query);

  const result = await pool.query(
    `SELECT ${ticketColumns} FROM ticket WHERE id = $1`,
    [Number(id)],
  );
  const foundTicket = result.rows[0];

  const statusCode = foundTicket ? 200 : 404;

  res.status(statusCode).json({
    message: foundTicket ? "Ok" : "Ticket not found!",
    data: foundTicket ?? null,
  });
});

app.post("/tickets", isValidBody, async (req: Request, res: Response) => {
  const { title, description } = req.body;

  if (typeof title !== "string" || typeof description !== "string") {
    return res.status(400).json({
      message: "Validation failed",
      data: null,
    });
  }

  if (!title.trim() || !description.trim()) {
    return res.status(400).json({
      message: "Validation failed",
      data: null,
    });
  }

  const titleLength = title.trim().length;

  if (titleLength < 10 || titleLength > 50) {
    return res.status(400).json({
      message: "Title must be between 10 and 50 characters",
      data: null,
    });
  }

  const descriptionLength = description.trim().length;

  if (descriptionLength < 10 || descriptionLength > 2000) {
    return res.status(400).json({
      message: "Description must be between 10 and 2000 characters",
      data: null,
    });
  }

  const result = await pool.query(
    `INSERT INTO ticket (title, description) VALUES ($1, $2) RETURNING ${ticketColumns}`,
    [title.trim(), description],
  );

  res.status(201).json({
    message: "Ticket created successfully",
    data: result.rows[0],
  });
});

app.delete(
  "/tickets/:id",
  isValidParam,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await pool.query("DELETE FROM ticket WHERE id = $1", [
      Number(id),
    ]);
    const deleted = result.rowCount === 1;

    const statusCode = deleted ? 200 : 404;

    res.status(statusCode).json({
      message:
        deleted
          ? "Ticket deleted successfully!"
          : "Ticket not found!",
      data: null,
    });
  },
);

app.patch(
  "/tickets/:id",
  isValidParam,
  isValidBody,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const body = req.body;

    if ("title" in body) {
      if (typeof body.title !== "string") {
        return res.status(400).json({
          message: "Validation failed",
          data: null,
        });
      }

      const titleLength = body.title.trim().length;

      if (titleLength < 10 || titleLength > 50) {
        return res.status(400).json({
          message: "Title must be between 10 and 50 characters",
          data: null,
        });
      }
    }

    if ("description" in body) {
      if (typeof body.description !== "string") {
        return res.status(400).json({
          message: "Validation failed",
          data: null,
        });
      }

      const descriptionLength = body.description.trim().length;

      if (descriptionLength < 10 || descriptionLength > 2000) {
        return res.status(400).json({
          message: "Description must be between 10 and 2000 characters",
          data: null,
        });
      }
    }

    const result = await pool.query(
      `UPDATE ticket
       SET title = COALESCE($2, title),
           description = COALESCE($3, description)
       WHERE id = $1
       RETURNING ${ticketColumns}`,
      [
        Number(id),
        "title" in body ? body.title.trim() : null,
        "description" in body ? body.description : null,
      ],
    );
    const foundTicket = result.rows[0];

    const statusCode = foundTicket ? 200 : 404;

    res.status(statusCode).json({
      message: foundTicket
        ? "Ticket updated successfully!"
        : "Ticket not found!",
      data: foundTicket ?? null,
    });
  },
);

type AppError = Error & {
  type?: string;
  status?: number;
  code?: string;
};

app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Invalid JSON",
      data: null,
    });
  }

  if (err.status === 413) {
    return res.status(413).json({
      message: "Request size is too long",
      data: null,
    });
  }

  if (err.code === "23514" || err.code === "22001") {
    return res.status(400).json({
      message: "Validation failed",
      data: null,
    });
  }

  const statusCode = err.status;

  if (
    typeof statusCode === "number" &&
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode <= 499
  ) {
    return res.status(statusCode).json({
      message: "Invalid request",
      data: null,
    });
  }

  return res.status(500).json({
    message: "Internal Server Error",
    data: null,
  });
});

app.listen(5000);
