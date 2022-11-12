type dataTypes = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function" | "array";
type query<T extends string> = { [key in T]: string | number | boolean | null | undefined | bigint | { $gte?: number, $gt?: number, $lt?: number, $lte?: number, $in: string | number | boolean | null | undefined | bigint } };
type defaultScheme = { [k: string]: { index?: boolean, type: dataTypes, required?: boolean, unique?: true, default: any } };
export class RamDB<Model> {

  data: Model;
  autoSaveInterval?: NodeJS.Timer;

  constructor(ctx: { path: string, timeout?: number, default: Model, customClasses?: CustomClass<any>[], autoSaveInterval?: number, minify?: boolean });

  saveData(): void;

}

interface CustomClass<T> { }

export function toCustomClass<T>(mClass: T): CustomClass<T>;

export class Ramoose<Scheme> {

  // create private type that loops through scheme and returns its dataTypes
  #data: { [k in keyof Scheme]: Scheme[k] extends { type: infer T } ? T : Scheme[k] };

  constructor(ctx: {scheme: Scheme, path: string, minify: boolean});

  // create methods named findOne deleteOne findMany deleteMany create

  findOne(query: query<keyof Scheme>): Promise<any>;

  deleteOne(query: query<keyof Scheme>): Promise<any>;

  findMany(query: query<keyof Scheme>): Promise<any>;

  deleteMany(query: query<keyof Scheme>): Promise<any>;

  create(data: query<keyof Scheme>): Promise<any>;

}