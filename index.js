const _ = require("lodash");
const fs = require("fs");

module.exports.RamDB = class RamDB {

  constructor(args = {}) {
    this.path = args.path;
    this.customClasses = Object.fromEntries(args.customClasses.map(cc => [cc.constructor?.name, cc]));
    this.data = args.default ?? [];
    try {
      this.data = JSON.parse(fs.readFileSync(this.path, "utf-8"), (k, v) => {
        if (v?.customClass && this.customClasses?.[v.customClass]) return new (this.customClasses[v.customClass])(v.data);
        return v;
      });
    } catch (err) { console.error(err) };
    this.saveData = _.throttle(() => this.#saveData(), args.timeout > 100 ? args.timeout : 5000);
    this.saveData();
  }

  #saveData() {
    let data = JSON.stringify(this.data, null, 2);
    fs.writeFileSync(this.path, data);
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
