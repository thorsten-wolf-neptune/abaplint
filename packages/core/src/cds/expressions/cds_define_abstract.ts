import {CDSAnnotation} from ".";
import {Expression, str, seq, star, opt, plus} from "../../abap/2_statements/combi";
import {IStatementRunnable} from "../../abap/2_statements/statement_runnable";
import {CDSName} from "./cds_name";

export class CDSDefineAbstract extends Expression {
  public getRunnable(): IStatementRunnable {
    const field = seq(star(CDSAnnotation), str("KEY"), CDSName, ":", CDSName, ";");
    return seq(star(CDSAnnotation), str("DEFINE ABSTRACT ENTITY"), CDSName, str("{"),
               plus(field),
               str("}"), opt(";"));
  }
}