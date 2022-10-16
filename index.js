const _ = require("lodash");
const fs = require("fs");

module.exports.RamDB = class RamDB {

  constructor(args = {}) {
    this.path = args.path;
    this.customClasses = Object.fromEntries(args.customClasses.map(cc => [cc.constructor?.name, cc]));
    this.data = args.default ?? [];
    this.minify = args.minify ?? true;
    try {
      this.data = JSON.parse(fs.readFileSync(this.path, "utf-8"), (this.customClasses ? (k, v) => {
        if (v?.customClass && this.customClasses?.[v.customClass]) return new (this.customClasses[v.customClass])(v.data);
        return v;
      } : undefined));
    } catch (err) { console.error(err) };
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
