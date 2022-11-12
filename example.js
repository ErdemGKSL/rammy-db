const { Ramoose } = require(".");

const db = new Ramoose({
  path: "./example.json",
  minify: false,
  scheme: {
    xd: "string",
    userId: {
      required: true,
      // index: true,
      type: "string"
    },
    guildId: {
      required: true,
      // index: true,
      type: "string"
    },
    data: {
      type: "object"
    },
    date: {
      type: "number",
    }
  }
});

(async () => {
  db.data;
  console.time("deleteOne")

  await db.deleteOne({
    userId: "1234",
    guildId: "321",
  });
  console.timeEnd("deleteOne")
  console.time("create");

  for (let i = 0; i < 500; i++) {
    db.create({
      userId: Math.floor(Math.random() * 10000).toString(),
      guildId: Math.floor(Math.random() * 3).toString(),
    })
  }
  await db.create({
    userId: "123",
    guildId: "321",
    data: {},
    date: 1000,
  });
  console.timeEnd("create")


  console.time("findMany")

  let data = await db.findMany({
    guildId: "2"
  });
  console.timeEnd("findMany")

  console.log(data);
  console.time("updateOne")
  db.updateOne({
    userId: "123",
    guildId: "321",
  }, {
    date: { $inc: 10 },
    userId: "1234",
  });
  console.timeEnd("updateOne")

  // for (let key in db.indexes) {
    // console.log(db.indexes)
  // }

  data = await db.findOne({
    date: {
      $gte: 900
    }
  });
  console.time("deleteOne")

  // await db.deleteMany({
  //   userId: "1234",
  //   guildId: "321",
  // });
  console.timeEnd("deleteOne")
  console.log(data);

})();