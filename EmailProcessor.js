module.exports = (header, body) => {
  class EmailProcessor {
    constructor(header, body) {
      this.header = header;
      this.body = body;
    }

    process() {
      console.log("Processing email...");
      console.log("Header =", this.header);
      console.log("Body =", this.body);
    }
  }

  return new EmailProcessor(header, body);
};
