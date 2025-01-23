const Imap = require("imap");
const inspect = require("util").inspect;

const credentials = require("./credentials");

credentials.forEach((credential) => {
  const imap = new Imap(credential);

  imap.on("ready", () => {
    console.log(`Connected to ${credential.host}!`);

    imap.openBox("INBOX", true, (err, box) => {
      if (err) throw err;
      console.log("INBOX opened", box);
      console.log("Waiting for new messages...");

      imap.on("mail", (numNewMsgs) => {
        console.log("You have " + numNewMsgs + " new messages");
        const f = imap.seq.fetch(`${box.uidnext}:*`, {
          bodies: ["HEADER.FIELDS (FROM SUBJECT)", "TEXT"],
          struct: true,
        });

        f.on("message", (msg, seqno) => {
          console.log("Message #%d", seqno);
          const prefix = "(#" + seqno + ") ";

          msg.on("body", (stream, info) => {
            let buffer = "";

            stream.on("data", (chunk) => {
              buffer += chunk.toString("utf8");
            });

            stream.once("end", () => {
              console.log(
                prefix + "Parsed header: %s",
                inspect(Imap.parseHeader(buffer)),
                buffer.toString("utf8")
              );
            });
          });

          msg.once("attributes", (attrs) => {
            console.log(prefix + "Attributes: %s", inspect(attrs, false, 8));
          });

          msg.once("end", () => {
            console.log(prefix + "Finished");
          });
        });

        f.once("error", (err) => {
          console.log("Fetch error: " + err);
        });

        f.once("end", () => {
          console.log("Done fetching the latest message!");
        });
      });
    });
  });

  imap.on("error", (err) => {
    console.log("IMAP Error: " + err.message);
  });

  imap.on("end", () => {
    console.log("Connection ended");
  });

  imap.on("close", function () {
    console.log("Connection closed. Reconnecting...");
    imap.connect();
  });

  imap.connect();
});
