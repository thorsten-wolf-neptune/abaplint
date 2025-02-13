import {StatementNode} from "../nodes/statement_node";
import {MethodDef} from "../2_statements/statements/method_def";
import * as Expressions from "../2_statements/expressions";
import {ExpressionNode} from "../nodes";
import {TypedIdentifier, IdentifierMeta} from "./_typed_identifier";
import {ObjectReferenceType, UnknownType, VoidType} from "./basic";
import {CurrentScope} from "../5_syntax/_current_scope";
import {MethodDefReturning} from "../5_syntax/expressions/method_def_returning";
import {MethodParam} from "../5_syntax/expressions/method_param";
import {IMethodParameters} from "./_method_parameters";
import {ObjectOriented} from "../5_syntax/_object_oriented";
import {ReferenceType} from "../5_syntax/_reference";

// todo:
// this.exceptions = [];
// also consider RAISING vs EXCEPTIONS

export class MethodParameters implements IMethodParameters {
  private readonly importing: TypedIdentifier[];
  private readonly optional: string[];
  private readonly exporting: TypedIdentifier[];
  private readonly changing: TypedIdentifier[];
  private preferred: string | undefined;
  private returning: TypedIdentifier | undefined;
  private readonly exceptions: string[]; // todo, not filled
  private readonly defaults: {[index: string]: ExpressionNode};
  private readonly filename: string;

  public constructor(node: StatementNode, filename: string, scope: CurrentScope) {
    if (!(node.get() instanceof MethodDef)) {
      throw new Error("MethodDefinition, expected MethodDef as part of input node");
    }

    this.importing = [];
    this.exporting = [];
    this.changing = [];
    this.optional = [];
    this.defaults = {};
    this.returning = undefined;
    this.preferred = undefined;
    this.exceptions = [];
    this.filename = filename;

    this.parse(node, scope, filename);
  }

  public getFilename(): string {
    return this.filename;
  }

  public getOptional(): string[] {
    return this.optional;
  }

  public getAll(): TypedIdentifier[] {
    const ret: TypedIdentifier[] = [];
    const returning = this.getReturning();
    if (returning) {
      ret.push(returning);
    }
    ret.push(...this.getImporting());
    ret.push(...this.getExporting());
    ret.push(...this.getChanging());
    return ret;
  }

  public getDefaultImporting(): string | undefined {
    if (this.importing.length === 0) {
      return undefined;
    } else if (this.importing.length === 1) {
      return this.importing[0].getName().toUpperCase();
    } else if (this.preferred) {
      return this.preferred;
    }

    let candidates = this.importing.map(i => i.getName().toUpperCase());
    candidates = candidates.filter(c => this.optional.indexOf(c) < 0);
    if (candidates.length === 1) {
      return candidates[0];
    }

    return undefined;
  }

  public getImporting() {
    return this.importing;
  }

  public getRequiredParameters() {
    const ret: TypedIdentifier[] = [];

    for (const i of this.getImporting()) {
      if (this.getOptional().some(o => o.toUpperCase() === i.getName().toUpperCase()) === true) {
        continue;
      }
      ret.push(i);
    }
    for (const i of this.getChanging()) {
      if (this.getOptional().some(o => o.toUpperCase() === i.getName().toUpperCase()) === true) {
        continue;
      }
      ret.push(i);
    }

    return ret;
  }

  public getExporting() {
    return this.exporting;
  }

  public getChanging() {
    return this.changing;
  }

  public getReturning() {
    return this.returning;
  }

  public getExceptions() {
    return this.exceptions;
  }

  public getParameterDefault(parameter: string) {
    return this.defaults[parameter.toUpperCase()];
  }

///////////////////

  private parse(node: StatementNode, scope: CurrentScope, filename: string): void {

    const handler = node.findFirstExpression(Expressions.EventHandler);
    if (handler) {
      const nameToken = node.findFirstExpression(Expressions.ClassName)?.getFirstToken();
      const ooName = nameToken?.getStr();
      const def = scope.findObjectDefinition(ooName);
      const doVoid = def ? false : !scope.getDDIC().inErrorNamespace(ooName);
      if (def) {
        scope.addReference(nameToken, def, ReferenceType.ObjectOrientedReference, filename);
      } else if (doVoid && ooName) {
        scope.addReference(nameToken, undefined, ReferenceType.ObjectOrientedVoidReference,
                           this.filename, {ooName: ooName.toUpperCase()});
      }

      const eventName = node.findFirstExpression(Expressions.Field)?.getFirstToken().getStr();
      const event = new ObjectOriented(scope).searchEvent(def, eventName);
      for (const p of handler.findAllExpressions(Expressions.MethodParamName)) {
        const token = p.getFirstToken();
        const search = token.getStr().toUpperCase().replace("!", "");
        this.optional.push(search); // all parameters optional for event handlers
        if (search === "SENDER" && def) {
          this.importing.push(new TypedIdentifier(token, this.filename, new ObjectReferenceType(def), [IdentifierMeta.EventParameter]));
          continue;
        }
        const found = event?.getParameters().find(p => p.getName().toUpperCase() === search);
        if (found) {
          this.importing.push(new TypedIdentifier(token, this.filename, found.getType(), [IdentifierMeta.EventParameter]));
        } else if (doVoid) {
          this.importing.push(new TypedIdentifier(token, this.filename, new VoidType(ooName), [IdentifierMeta.EventParameter]));
        } else {
          const type = new UnknownType(`handler parameter not found "${search}"`);
          this.importing.push(new TypedIdentifier(token, this.filename, type, [IdentifierMeta.EventParameter]));
        }
      }
      return;
    }

    const importing = node.findFirstExpression(Expressions.MethodDefImporting);
    if (importing) {
      this.add(this.importing, importing, scope, [IdentifierMeta.MethodImporting]);
      if (importing.concatTokens().toUpperCase().includes(" PREFERRED PARAMETER")) {
        this.preferred = importing.getLastToken().getStr().toUpperCase();
      }
    }

    const exporting = node.findFirstExpression(Expressions.MethodDefExporting);
    if (exporting) {
      this.add(this.exporting, exporting, scope, [IdentifierMeta.MethodExporting]);
    }

    const changing = node.findFirstExpression(Expressions.MethodDefChanging);
    if (changing) {
      this.add(this.changing, changing, scope, [IdentifierMeta.MethodChanging]);
    }

    const returning = node.findFirstExpression(Expressions.MethodDefReturning);
    if (returning) {
      this.returning = new MethodDefReturning().runSyntax(returning, scope, this.filename, [IdentifierMeta.MethodReturning]);
    }
  }

  private add(target: TypedIdentifier[], source: ExpressionNode, scope: CurrentScope, meta: IdentifierMeta[]): void {
    for (const opt of source.findAllExpressions(Expressions.MethodParamOptional)) {
      const p = opt.findDirectExpression(Expressions.MethodParam);
      if (p === undefined) {
        continue;
      }
      target.push(new MethodParam().runSyntax(p, scope, this.filename, meta));
      if (opt.getLastToken().getStr().toUpperCase() === "OPTIONAL") {
        const name = target[target.length - 1].getName().toUpperCase();
        this.optional.push(name);
      } else if (opt.findFirstExpression(Expressions.Default)) {
        const name = target[target.length - 1].getName().toUpperCase();
        this.optional.push(name);

        const val = opt.findFirstExpression(Expressions.Default)?.getLastChild();
        if (val && val instanceof ExpressionNode) {
          this.defaults[name] = val;
        }
      }
    }
    if (target.length > 0) {
      return;
    }

    const params = source.findAllExpressions(Expressions.MethodParam);
    for (const param of params) {
      target.push(new MethodParam().runSyntax(param, scope, this.filename, meta));
    }
  }

}