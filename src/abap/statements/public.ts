import {Statement} from "./statement";
import {Class} from "./class";
import {str, IRunnable} from "../combi";

export class Public extends Statement {

  public static get_matcher(): IRunnable {
    return str("PUBLIC SECTION");
  }

  public isStructure() {
    return true;
  }

  public isValidParent(s) {
    return s instanceof Class;
  }

  public indentationSetStart() {
    return 2;
  }

  public indentationSetEnd() {
    return 4;
  }

}