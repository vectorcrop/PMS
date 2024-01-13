const mongoClient = require("mongodb").MongoClient;

const state = {
  db: null,
};

module.exports.connect = function (done) {
  // const url = "mongodb+srv://thevectorcrop:msb.com001@vc-projects.jdlpp5l.mongodb.net/?retryWrites=true&w=majority";
  const url = "mongodb+srv://thevectorcrop:msb.com002@mycms.dvf8n7l.mongodb.net/?retryWrites=true&w=majority";

  const dbname = "vc-projects";

  mongoClient.connect(url, { useUnifiedTopology: true }, (err, data) => {
    if (err) {
      return done(err);
    }
    state.db = data.db(dbname);

    done();
  });
};

module.exports.get = function () {
  return state.db;
};
