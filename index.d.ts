export class RamDB<Model> {

  data: Model;
  autoSaveInterval?: NodeJS.Timer;

  constructor(ctx: { path: string, timeout?: number, default: Model, customClasses?: CustomClass<any>[], autoSaveInterval?: number, minify?: boolean });

  saveData(): void;

}

interface CustomClass<T> {}

export function toCustomClass<T>(mClass: T): CustomClass<T>;