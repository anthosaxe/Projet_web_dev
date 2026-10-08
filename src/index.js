import express from "express";
import memberRouter from "./router/member.router.js";
import characterRouter from "./router/character.router.js";
import raidRouter from "./router/raid.router.js";
import registrationRouter from "./router/registration.router.js";

const app = express();

app.use(express.json());
app.use(memberRouter);
app.use(characterRouter);
app.use(raidRouter);
app.use(registrationRouter);

app.get("/", (req, res) => {
    res.json({ message: "API raid de guilde fonctionelle" });
});

app.listen(5000, () => {
    console.log("server started");
});