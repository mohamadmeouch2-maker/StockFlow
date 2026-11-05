import "./env"; // must be first: loads .env before the app reads process.env
import { app } from "./app";

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`Core API on http://localhost:${port}`));
