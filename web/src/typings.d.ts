/* SystemJS module definition */
declare var module: NodeModule;
interface NodeModule {
  id: string;
}

interface JQuery {
  datepicker: (options: any) => JQuery<HTMLElement>;
  timepicker: (options: any) => JQuery<HTMLElement>;
}