import connect from "#database";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import { settings } from "#/pages/admin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Check if the user is logged in and an admin
  const user = await getServerSession(req, res, authOptions);
  if (!user) {
    res.status(401).end("Not logged in");
    return;
  }
  if (!user.user.admin) {
    res.status(403).end("Not an admin");
    return;
  }
  switch (req.method) {
    case "POST":
      // Used to edit config
      let {
        body: { value = "0" },
      } = req;
      const {
        body: { name = "" },
      } = req;
      let fail = false;
      switch (name) {
        case "DownloadPicture":
          if (!["yes", "no", "needed", "new&needed"].includes(value)) {
            fail = true;
          }
          break;
        case "ThemeLight":
          break;
        case "ThemeDark":
          break;
        default:
          const setting = settings.filter((e) => e.shortName === name);
          if (setting.length > 0) {
            // Makes sure that the config was valid
            if (setting[0].variant === "number") {
              value = parseInt(value);
              if (!(value >= 0)) {
                fail = true;
              }
            } else if (setting[0].variant === "boolean") {
              value = value ? 1 : 0;
            }
          } else {
            res.status(400).end("Config value not found");
            fail = true;
          }
      }
      if (fail) {
        if (!res.writableEnded) res.status(400).end("Config value was invalid");
        return;
      }
      // If the signup with password value was changed regenerate the signin page
      if (name === "EnablePasswordSignup") {
        fetch(process.env.NEXTAUTH_URL_INTERNAL + "/api/revalidate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            secret: process.env.NEXTAUTH_SECRET,
            path: "/signin",
          }),
        });
      }
      const connection = await connect();
      await connection.query(
        "INSERT INTO data (value1, value2) VALUES (?, ?) ON DUPLICATE KEY UPDATE value2=?",
        ["config" + name, value, value],
      );
      res.status(200).end("Saved config change");
      connection.end();
      break;
    default:
      res.status(405).end(`Method ${req.method} Not Allowed`);
      break;
  }
}
