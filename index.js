const _ = require("lodash");
const fs = require("fs");
const { defaultify } = require("stuffs");
const dataTypes = ["string", "number", "bigint", "boolean", "symbol", "undefined", "object", "function", "array"];
/** @typedef {"string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function" | "array"} dataTypes */
module.exports.RamDB = class RamDB {

  constructor(args = {}) {
    this.path = args.path;
    this.customClasses = (args.customClasses && Object.fromEntries(args.customClasses.map(cc => [cc.constructor?.name, cc])));
    this.data = args.default ?? [];
    this.minify = args.minify ?? true;
    try {
      this.data = JSON.parse(fs.readFileSync(this.path, "utf-8"), (this.customClasses ? (k, v) => {
        if (v?.customClass && this.customClasses?.[v.customClass]) return new (this.customClasses[v.customClass])(v.data);
        return v;
      } : undefined));
    } catch (err) { };
    this.data = defaultify(this.data, args.default ?? []);
    this.saveData = _.throttle(() => this.#saveData(), args.timeout > 100 ? args.timeout : 5000);
    this.saveData();
    if (args.autoSaveInterval > 1)
      this.autoSaveInterval = setInterval(() => {
        this.saveData();
      }, args.autoSaveInterval)
  }

  async #saveData() {
    let data = JSON.stringify(this.data, null, this.minify ? undefined : 2);
    await fs.promises.writeFile(this.path, data);
  }

};

module.exports.toCustomClass = function toCustomClass(mClass) {
  if (mClass.prototype.__toJSON) return;
  mClass.prototype.__toJSON = mClass.prototype.toJSON;
  mClass.prototype.toJSON = function toJSON() {
    const self = this;
    return {
      customClass: self.constructor.name,
      data: self.__toJSON(),
    }
  };
  return mClass;
}

module.exports.Ramoose = class Ramoose {
  #db;
  #schema;
  #defaultObject;
  #indexList;
  /**
   * 
   * @param {{ schema: {[k: string]: { index?: boolean, type: dataTypes, required?: boolean, unique?: true, default: any }}}} param0 
   */
  constructor({ path, minify, schema } = {}) {

    for (let key in schema) {
      if (typeof schema[key] === "string") schema[key] = { type: schema[key] };
    }

    console.warn("WARNING", "Ramoose is an experimantel feature.");
    this.#schema = schema;
    this.#db = new module.exports.RamDB({ path, minify });
    this.#defaultObject = Object.fromEntries(
      Object.entries(schema).filter(x => getType(x[1].default) === x[1].type).map(([k, v]) => [k, v.default])
    )
    this.#indexList = Object.entries(schema).filter(x => typeof x[1] == "object" && (x[1].index || x[1].unique)).map((e) => e[0]);
    /** @type {{ [k: string]: { [k: string]: Set }}} */
    this.indexes = Object.fromEntries(
      getCombinations(this.#indexList)
        ?.sort((a, b) => b.length - a.length)
        ?.map(s => [(Array.isArray(s) ? s.sort((a, b) => a > b ? 1 : -1).join("᠆☼᠆") : s), {}]) ?? []
    );
    this.#injectIndexes();
  }
  #injectIndexes() {
    this.#db.data.forEach(/** @param {{k: string}: any } data */(data) => {
      const keys = Object.keys(data).sort((a, b) => a > b ? 1 : -1)
      for (let keysStr in this.indexes) {
        const keysArr = keysStr.split("᠆☼᠆");
        if (keysArr.every((k) => keys.includes(k))) {
          const indexKey = keysArr.map(k => data[k]).join("᠆☼᠆");
          if (!this.indexes[keysStr][indexKey]) this.indexes[keysStr][indexKey] = new Set();
          this.indexes[keysStr][indexKey].add(data);
        }
      }
    })
  }

  create(rData) {
    const data = defaultify(rData, this.#defaultObject);
    this.#db.data.push(data);

    const keys = Object.keys(data).sort((a, b) => a > b ? 1 : -1);

    for (let keysStr in this.indexes) {
      const keysArr = keysStr.split("᠆☼᠆");
      if (keysArr.every((k) => keys.includes(k))) {
        const indexKey = keysArr.map(k => data[k]).join("᠆☼᠆");
        if (!this.indexes[keysStr][indexKey]) this.indexes[keysStr][indexKey] = new Set();
        this.indexes[keysStr][indexKey].add(data);
      }
    }

    this.#db.saveData();
  }

  findOne(query) {

    const allKeys = Object.keys(query).sort((a, b) => a > b ? 1 : -1);
    const keys = allKeys.filter(k => getType(query[k]) === this.#schema[k]?.type);
    const otherKeys = allKeys.filter(k => getType(query[k]) !== this.#schema[k]?.type && getType(query[k]) === "object");
    const keysAStr = keys.join("᠆☼᠆");

    if (this.indexes[keysAStr]) {
      return this.indexes[keysAStr][keys.map(k => query[k]).join("᠆☼᠆")]?.values().next()?.value;
    }

    for (let keysStr in this.indexes) {
      const keysArr = keysStr.split("᠆☼᠆");
      if (keysArr.every((k) => keys.includes(k))) {
        const indexKey = keysArr.map(k => query[k]).join("᠆☼᠆");
        if (!this.indexes[keysStr][indexKey]) return undefined;
        return [...this.indexes[keysStr][indexKey]].find(d => {
          if (keys.every(k => query[k] === d[k])) {
            return otherKeys.every(k => {
              if (query[k].$in) {
                return d[k].includes(query[k].$in);
              } else if (query[k].$gte) {
                return query[k].$gte >= d[k];
              } else if (query[k].$gt) {
                return query[k].$gt > d[k];
              } else if (query[k].$lte) {
                return query[k].$lte <= d[k];
              } else if (query[k].$lt) {
                return query[k].$lte < d[k];
              }
            });
          }
          return false;
        });
      }
    }

    return this.#db.data.find(d => {
      if (keys.every(k => query[k] === d[k])) {
        return otherKeys.every(k => {
          if (query[k].$in) {
            return d[k].includes(query[k].$in);
          } else if (query[k].$gte) {
            return query[k].$gte >= d[k];
          } else if (query[k].$gt) {
            return query[k].$gt > d[k];
          } else if (query[k].$lte) {
            return query[k].$lte <= d[k];
          } else if (query[k].$lt) {
            return query[k].$lte < d[k];
          }
        });
      }
      return false;
    });

  }

  findMany(query) {

    const allKeys = Object.keys(query).sort((a, b) => a > b ? 1 : -1);
    const keys = allKeys.filter(k => getType(query[k]) === this.#schema[k]?.type);
    const otherKeys = allKeys.filter(k => getType(query[k]) !== this.#schema[k]?.type && getType(query[k]) === "object");
    const keysAStr = keys.join("᠆☼᠆");

    if (this.indexes[keysAStr]) {
      return [...(this.indexes[keysAStr][keys.map(k => query[k]).join("᠆☼᠆")] || [])];
    }

    for (let keysStr in this.indexes) {
      const keysArr = keysStr.split("᠆☼᠆");
      if (keysArr.every((k) => keys.includes(k))) {
        const indexKey = keysArr.map(k => query[k]).join("᠆☼᠆");
        if (!this.indexes[keysStr][indexKey]) return [];
        return [...this.indexes[keysStr][indexKey]].filter(d => {
          if (keys.every(k => query[k] === d[k])) {
            return otherKeys.every(k => {
              if (query[k].$in) {
                return d[k].includes(query[k].$in);
              } else if (query[k].$gte) {
                return query[k].$gte >= d[k];
              } else if (query[k].$gt) {
                return query[k].$gt > d[k];
              } else if (query[k].$lte) {
                return query[k].$lte <= d[k];
              } else if (query[k].$lt) {
                return query[k].$lte < d[k];
              }
            });
          }
          return false;
        });
      }
    }

    return this.#db.data.filter(d => {
      if (keys.every(k => query[k] === d[k])) {
        return otherKeys.every(k => {
          if (query[k].$in) {
            return d[k].includes(query[k].$in);
          } else if (query[k].$gte) {
            return query[k].$gte >= d[k];
          } else if (query[k].$gt) {
            return query[k].$gt > d[k];
          } else if (query[k].$lte) {
            return query[k].$lte <= d[k];
          } else if (query[k].$lt) {
            return query[k].$lte < d[k];
          }
        });
      }
      return false;
    });

  }

  deleteByData(data) {
    const index = this.#db.data.indexOf(data);
    if (index !== -1) {
      this.#db.data.splice(index, 1).length;
      const keys = Object.keys(data);
      for (let keysStr in this.indexes) {
        const keysArr = keysStr.split("᠆☼᠆");
        if (keysArr.every((k) => keys.includes(k))) {
          const indexKey = keysArr.map(k => query[k]).join("᠆☼᠆");
          if (!this.indexes[keysStr][indexKey]) continue;
          this.indexes[keysStr][indexKey]?.delete(data);
        }
      }
    }
    else return 0;
    this.#db.saveData();
    return 1;
  }

  deleteOne(query) {
    const data = this.findOne(query);
    if (!data) return null;

    const index = this.#db.data.indexOf(data);
    if (index !== -1) {
      this.#db.data.splice(index, 1);
      const keys = Object.keys(data);
      for (let keysStr in this.indexes) {
        const keysArr = keysStr.split("᠆☼᠆");
        if (keysArr.every((k) => keys.includes(k))) {
          const indexKey = keysArr.map(k => query[k]).join("᠆☼᠆");
          if (!this.indexes[keysStr][indexKey]) continue;
          this.indexes[keysStr][indexKey]?.delete(data);
        }
      }
    }
    else return 0;

    return data;
  }

  deleteMany(query) {
    const data = this.findMany(query);
    if (!data?.length) return null;
    let dSize = 0;
    data.forEach(d => {
      const index = this.#db.data.indexOf(d);
      if (index !== -1) {
        this.#db.data.splice(index, 1);
        const keys = Object.keys(d);
        for (let keysStr in this.indexes) {
          const keysArr = keysStr.split("᠆☼᠆");
          if (keysArr.every((k) => keys.includes(k))) {
            const indexKey = keysArr.map(k => query[k]).join("᠆☼᠆");
            if (!this.indexes[keysStr][indexKey]) continue;
            this.indexes[keysStr][indexKey]?.delete(d);
          }
        }
        dSize++;
      }
    });
    return dSize;
  };



};

function getType(data) {
  return Array.isArray(data) ? "array" : typeof data;
}

function getCombinations(valuesArray) {

  var combi = [];
  var temp = [];
  var slent = Math.pow(2, valuesArray.length);

  for (var i = 0; i < slent; i++) {
    temp = [];
    for (var j = 0; j < valuesArray.length; j++) {
      if ((i & Math.pow(2, j))) {
        temp.push(valuesArray[j]);
      }
    }
    if (temp.length > 0) {
      combi.push(temp);
    }
  }

  combi.sort((a, b) => a.length - b.length);
  console.log(combi.join("\n"));
  return combi;
};