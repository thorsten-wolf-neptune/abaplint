import {Issue} from "../issue";
import {BasicRuleConfig} from "./_basic_rule_config";
import {ABAPRule} from "./_abap_rule";
import * as Statements from "../abap/2_statements/statements";
import {IRuleMetadata, RuleTag} from "./_irule";
import {ABAPFile} from "../abap/abap_file";
import {Version} from "../version";

export class PreferCorrespondingConf extends BasicRuleConfig {
}

export class PreferCorresponding extends ABAPRule {
  private conf = new PreferCorrespondingConf();

  public getMetadata(): IRuleMetadata {
    return {
      key: "prefer_corresponding",
      title: "Prefer corresponding( ) to MOVE-CORRESPONDING",
      shortDescription: `Prefer corresponding( ) to MOVE-CORRESPONDING, from v740sp05 and up`,
      tags: [RuleTag.SingleFile, RuleTag.Upport],
    };
  }

  public getConfig() {
    return this.conf;
  }

  public setConfig(conf: PreferCorrespondingConf) {
    this.conf = conf;
  }

  public runParsed(file: ABAPFile) {
    const issues: Issue[] = [];

    if (this.reg.getConfig().getVersion() < Version.v740sp05) {
      return issues;
    }

    const message = "Use CORRESPONDING type( ... ) instead";
    for (const stat of file.getStatements()) {
      if (stat.get() instanceof Statements.MoveCorresponding
          && stat.getChildren().length === 7) {
        issues.push(Issue.atStatement(file, stat, message, this.getMetadata().key, this.conf.severity));
      }
    }

    return issues;
  }

}