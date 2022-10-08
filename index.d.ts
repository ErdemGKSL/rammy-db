export class RamDB<Model> {

  data: Model;

  constructor(ctx: { path: string, timeout?: number, default: Model, customClasses: CustomClass<any>[] });

  saveData(): Promise<void>;

}

interface CustomClass<T> {}

export function toCustomClass<T>(mClass: T): CustomClass<T>;