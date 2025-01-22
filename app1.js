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

        // const senderEmails = ["noreply@tokopedia.com"];
        const senderEmails = ["bagas@lamsolusi.com", "udibagas@gmail.com"]; // test doank
        const senderCriteria = senderEmails.map((email) => ["FROM", email]);
        const searchCriteria = [["OR", ...senderCriteria], "UNSEEN"];
        const fetchOptions = {
          bodies: ["HEADER.FIELDS (SENDER SUBJECT DATE MESSAGE-ID)", "TEXT"],
          struct: false,
        };

        imap.search(searchCriteria, (err, results) => {
          if (err) throw err;
          console.log("Result =", results);

          if (results.length === 0) {
            console.log("No new messages from the specified senders");
            return;
          }

          const latestEmail = results.at(-1);
          const f = imap.fetch(latestEmail, fetchOptions);

          f.on("message", (msg, seqno) => {
            console.log("Message #%d", seqno);
            const prefix = "(#" + seqno + ") ";

            msg.on("body", (stream, info) => {
              console.log("Info =", info);
              let buffer = "";

              stream.on("data", (chunk) => {
                buffer += chunk.toString("utf8");
              });

              stream.once("end", () => {
                if (info.which === "TEXT") {
                  console.log(prefix + "Body: %s", buffer.toString("utf8"));
                }

                if (info.which === "HEADER.FIELDS (FROM SUBJECT DATE)") {
                  console.log(
                    prefix + "Parsed header: %s",
                    inspect(Imap.parseHeader(buffer))
                  );
                }
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
            console.log("Fetch error: " + err.message);
          });

          f.once("end", () => {
            console.log("Done fetching the latest message!");
          });
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
