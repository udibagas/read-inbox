const Imap = require("imap");
const inspect = require("util").inspect;

const credentials = require("./credentials");

credentials.forEach((credential) => {
  const imap = new Imap({
    ...credential,
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false,
    },
  });

  let header = null;
  let body = null;

  imap.on("ready", () => {
    console.log(`Connected to ${credential.host}!`);

    imap.openBox("INBOX", true, (err, box) => {
      if (err) throw err;
      console.log("INBOX opened", box);
      console.log("Waiting for new messages...");
      let uidNext = box.uidnext;

      imap.on("mail", (numNewMsgs) => {
        console.log("You have " + numNewMsgs + " new messages");

        // const senderEmails = ["noreply@tokopedia.com"];
        const senderEmails = ["bagas@lamsolusi.com", "udibagas@gmail.com"]; // test doank
        const senderCriteria = senderEmails.map((email) => ["FROM", email]);
        const searchCriteria = [
          ["OR", ...senderCriteria],
          ["UID", `${uidNext}:*`],
          "UNSEEN",
        ];
        const fetchOptions = {
          bodies: ["HEADER.FIELDS (FROM SUBJECT DATE)", "TEXT"],
          struct: false,
        };

        imap.search(searchCriteria, (err, results) => {
          if (err) return console.error(err.message);
          console.log("Result =", results);

          if (results.length === 0) {
            console.log("No new messages from the specified criteria");
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
                  body = buffer.toString("utf8");
                  console.log(prefix + "Body: %s", body);
                }

                if (info.which === "HEADER.FIELDS (FROM SUBJECT DATE)") {
                  const currentHeader = Imap.parseHeader(buffer);

                  header = {
                    from: currentHeader.from[0],
                    subject: currentHeader.subject[0],
                    date: new Date(currentHeader.date[0]),
                  };

                  console.log(
                    prefix + "Parsed header: %s",
                    inspect(currentHeader)
                  );
                }
              });
            });

            msg.once("attributes", (attrs) => {
              console.log(prefix + "Attributes: %s", inspect(attrs, false, 8));
              uidNext = attrs.uid + 1;
            });

            msg.once("end", () => {
              console.log(prefix + "Finished");
              const emailProcessor = require("./EmailProcessor")(header, body);
              emailProcessor.process();
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
