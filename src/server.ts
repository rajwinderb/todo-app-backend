import express from "express";
import cors from "cors";
import { Client } from "pg";
import dotenv from "dotenv";
import filePath from "./filePath";

interface ToDo {
  // id: number;
  todo: string;
  done: boolean;
  createdAt: number;
}

// loading in some dummy items into the database
// (comment out if desired, or change the number)
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
};

const client = new Client(dbConfig);

const databaseConnection = async () => {
  await client.connect();
  console.log("Connected to todo db!");
};
databaseConnection();

const app = express();

/** Parses JSON data in a request automatically */
app.use(express.json());
/** To allow 'Cross-Origin Resource Sharing': https://en.wikipedia.org/wiki/Cross-origin_resource_sharing */
app.use(cors());

// read in contents of any environment variables in the .env file
dotenv.config();

// use the environment variable PORT, or 4000 as a fallback
const PORT_NUMBER = process.env.PORT ?? 4000;

// API info page
app.get("/", (req, res) => {
  const pathToFile = filePath("../public/index.html");
  res.sendFile(pathToFile);
});

// GET /todos
app.get("/todos", async (req, res) => {
  const todo = "SELECT * FROM todos ORDER BY createdAt LIMIT 50";
  const values: string[] = [];
  const getAllToDos = await client.query(todo, values);

  const allToDos = getAllToDos.rows;
  res.status(200).json({
    status: "success",
    allToDos,
  });
});

// POST /todos
app.post<{}, {}, ToDo>("/todos", async (req, res) => {
  const { todo } = req.body;
  if (typeof todo === "string") {
    const createdTodo = await client.query(
      "INSERT INTO todos VALUES (default, $1) RETURNING *",
      [todo]
    );
    res.status(201).json({
      status: "success",
      newTodo: createdTodo.rows[0],
    });
  } else {
    res.status(400).json({
      status: "fail",
      data: {
        message: "You must provide some todo for your todo.",
      },
    });
  }
});

// GET /todos/:id
app.get<{ id: string }>("/todos/:id", async (req, res) => {
  const id = parseInt(req.params.id); // params are always string type

  const getTodoById = await client.query(
    "SELECT * FROM todos WHERE id = ($1)",
    [id]
  );
  const todo = getTodoById.rows[0];

  if (todo) {
    res.status(200).json({
      status: "success",
      todo,
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a todo with that id.",
      },
    });
  }
});

// DELETE /todos/:id
app.delete<{ id: string }>("/todos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const getTodoById = await client.query(
    "SELECT * FROM todos WHERE id = ($1)",
    [id]
  );
  console.log(getTodoById);

  if (getTodoById) {
    const queryResult = await client.query(
      "DELETE FROM todos WHERE id = ($1)",
      [id]
    );
    if (queryResult.rowCount === 1) {
      res.status(200).json({
        status: "success",
      });
    } else {
      res.status(404).json({
        status: "fail",
        data: {
          id: "Something went wrong with deletion.",
        },
      });
    }
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a todo with that id.",
      },
    });
  }
});

// PATCH /todos/:id
app.patch<{ id: string }, {}, Partial<ToDo>>("/todos/:id", async (req, res) => {
  const { todo, done } = req.body;
  const id = parseInt(req.params.id);

  // update if just todo is changed
  if (todo && typeof todo === "string") {
    const updateResponse = await client.query(
      "UPDATE todos SET todo = $2 WHERE id = $1 RETURNING *",
      [id, todo]
    );

    if (updateResponse.rowCount === 1) {
      const updatedTodo = updateResponse.rows[0];
      res.status(201).json({
        status: "success",
        data: {
          todo: updatedTodo,
        },
      });
    } else {
      res.status(404).json({
        status: "fail",
        data: {
          id: "Could not find a todo with that id.",
        },
      });
    }
  }
  // update if just done is changed)
  else if (typeof done === "boolean") {
    const updateResponse = await client.query(
      "UPDATE todos SET done = $2 WHERE id = $1 RETURNING *",
      [id, done]
    );

    if (updateResponse.rowCount === 1) {
      const updatedTodo = updateResponse.rows[0];
      res.status(201).json({
        status: "success",
        data: {
          todo: updatedTodo,
        },
      });
    } else {
      res.status(404).json({
        status: "fail",
        data: {
          id: "Could not find a todo with that id.",
        },
      });
    }
  } else {
    res.status(400).json({
      status: "fail",
      data: {
        name: "You must provide some todo for your todo.",
      },
    });
  }
});

app.listen(PORT_NUMBER, () => {
  console.log(`Server is listening on port ${PORT_NUMBER}!`);
});
