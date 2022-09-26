// 语法解析器，根据词法分析生成的 token 列表来生成 ast
// 对于每一个节点。都有特定的内容构成，来描述 js 语法
import {Token,TokenType} from "./tokenizer";
export enum NodeType {
    Program = "Program", // ast 主干类型（表示一个程序代码），即一个 ast 是从主干入口 Program 类型节点开始的
    VariableDeclaration = "VariableDeclaration", // 变量声明关键字 ast 类型 用于描述使用什么关键字进行变量声明，即let a 中的 let
    VariableDeclarator = "VariableDeclarator", // 变量声明者 ast 类型，位于是 VariableDeclaration 的 declarations 属性中
    Identifier = "Identifier", // 变量名的描述 ast 类型，用于描述声明的变量叫什么，即 let a 中 的 a；位于 VariableDeclarator 的 id 属性中
    FunctionExpression = "FunctionExpression", // 函数表达式 ast 类型，用于描述定义了一个函数，位于 VariableDeclarator 的 int 属性中，即 let a = function
    BlockStatement = "BlockStatement", // 闭合状态 ast 类型，用于描述一个闭合状态，即 function(){} 中的 {},其实就是函数体，位于 FunctionExpression 的 body 属性中
    FunctionDeclaration = "FunctionDeclaration",
    ExpressionStatement = "ExpressionStatement",
    ReturnStatement = "ReturnStatement",
    CallExpression = "CallExpression",
    BinaryExpression = "BinaryExpression",
    MemberExpression = "MemberExpression",
    Literal = "Literal",
    ImportDeclaration = "ImportDeclaration",
    ImportSpecifier = "ImportSpecifier",
    ImportDefaultSpecifier = "ImportDefaultSpecifier",
    ImportNamespaceSpecifier = "ImportNamespaceSpecifier",
    ExportDeclaration = "ExportDeclaration",
    ExportSpecifier = "ExportSpecifier",
    ExportDefaultDeclaration = "ExportDefaultDeclaration",
    ExportNamedDeclaration = "ExportNamedDeclaration",
    ExportAllDeclaration = "ExportAllDeclaration",
}

// 变量名
export interface Identifier {
    type: NodeType.Identifier;
    name: string; // 变量名称
    start: number
    end:number
}

interface Expression {
    start: number
    end:number
}

interface Statement {
    start: number
    end:number
}

export interface Program {
    type: NodeType.Program;
    start: number
    end:number
    body: Statement[];
}

// 变量声明者
export interface VariableDeclarator {
    type: NodeType.VariableDeclarator;
    id: Identifier; // 描述声明变量名称
    init: Expression;// 描述声明变量的值
    start: number
    end:number
}
// 变量声明
export interface VariableDeclaration {
    type: NodeType.VariableDeclaration;
    kind: "var" | "let" | "const"; // 声明类别
    declarations: VariableDeclarator[]; // 变量声明者，里面描述了声明的名称、值
    start: number
    end:number
}

export interface FunctionExpression  {
    type: NodeType.FunctionExpression;
    id: Identifier | null; // 函数名称。表达式声明时，为 null
    params: Expression[] | Identifier[]; // 函数参数
    body: BlockStatement; // 函数体
    start: number
    end:number
}

export interface BlockStatement {
    type: NodeType.BlockStatement;
    body: Statement[]; // 闭合状态，描述函数时使用
    start: number
    end:number
}

export interface FunctionNode  {
    id: Identifier | null;
    params: Expression[] | Identifier[];
    body: BlockStatement;
    start: number
    end:number
}

export interface IFunctionExpression extends FunctionNode {
    type: NodeType.FunctionExpression;
}

export type TExpression = IFunctionExpression;

export type VariableKind = "let";

export class Parser {
    // 词法解析的 token 列表
    private _tokens: Token[] = [];
    // 当前遍历指向的词法解析 token 列表指针（索引）
    private _currentIndex = 0;
    constructor(token: Token[]) {
        this._tokens = [...token];
    }
    // 语法解析器入口
    parse(): Program {
        return this._parseProgram();
    }
    // 语法解析器核心方法
    private _parseProgram(): Program {
        // 定义 ast 入口节点
        // @ts-ignore
        const program: Program = {
            type: NodeType.Program,
            body: [],
            start: 0,
            end: Infinity,
        };
        // 解析 token 数组
        // 一个程序(Program)实际上由各个语句(Statement)来构成，
        // 因此在_parseProgram逻辑中，我们主要做的就是扫描一个个语句，
        // 然后放到 Program 对象的 body 中。
        while (!this._isEnd()) {
            const node = this._parseStatement();
            program.body.push(node);
            if (this._isEnd()) {
                program.end = node.end;
            }
        }
        return program;
    }


    //解析语句
    private _parseStatement(): Statement {
        // TokenType 来自 Tokenizer 的实现中
        // 开始时如果指向的是 let token，返回变量声明节点类型（VariableDeclaration）的解析结果
        if (this._checkCurrentTokenType(TokenType.Let)) {
            return this._parseVariableDeclaration();
        }
        throw new Error("Unexpected token");
    }

    // 变量声明节点类型（VariableDeclaration）的解析
    // 这个方法其实就是在根据此法分析token，填充 VariableDeclaration 这个接口
    private _parseVariableDeclaration(): VariableDeclaration {
        // 获取语句开始位置
        const { start } = this._getCurrentToken();
        // 拿到 let
        const kind = this._getCurrentToken().value;
        // 消费 let

        this._goNext(TokenType.Let);
        const declarations = [];
        const isVariableDeclarationEnded = (): boolean => {
            // 分号 ；表示结束，即 let a,b;
            if (this._checkCurrentTokenType(TokenType.Semicolon)) {
                return true;
            }
            const nextToken = this._getNextToken();
            // 往后看一个 token，如果是 =，则表示没有结束
            if (nextToken && nextToken.type === TokenType.Assign) {
                return false;
            }
            // 即 let a,b
            return true;
        };
        // 这里循环其实就是为了处理 let a,b,c = 0
        // isVariableDeclarationEnded 判断是否结束
        while (!isVariableDeclarationEnded()) {
            // 解析 let a 中的 a
            const id = this._parseIdentifier();
            let init = null;
            // 检查通过循环消费后，是否当前指向了 =
            if (this._checkCurrentTokenType(TokenType.Assign)) {
                this._goNext(TokenType.Assign);
                if (
                    this._checkCurrentTokenType([
                        TokenType.Number,
                        TokenType.StringLiteral,
                    ])
                ) {
                    // TODO _parseLiteral
                    // init = this._parseLiteral();
                } else {
                    // 解析函数表达式
                    init = this._parseExpression();
                }
            }
            // 构造 VariableDeclarator 节点
            const declarator: VariableDeclarator = {
                type: NodeType.VariableDeclarator,
                id,
                // @ts-ignore
                init,
                start: id.start,
                end: init ? init.end : id.end,
            };
            // VariableDeclarator 节点推入数组
            // 这里其实就是在处理 let a,b,c = 的这种情况
            declarations.push(declarator);
            // 消费逗号
            if (this._checkCurrentTokenType(TokenType.Comma)) {
                this._goNext(TokenType.Comma);
            }
        }
        // 构造 Declaration 节点
        return {
            type: NodeType.VariableDeclaration,
            kind: kind as VariableKind,
            declarations,
            start,
            end: this._getPreviousToken().end,
        } as VariableDeclaration
    }

    // 1. 解析变量名，其实就是填充 Identifier 接口
    private _parseIdentifier(): Identifier {
        // 获取当前 token
        const token = this._getCurrentToken();
        // 构造节点
        const identifier: Identifier = {
            type: NodeType.Identifier,
            name: token.value!,
            start: token.start,
            end: token.end,
        };
        // 消费当前 token
        this._goNext(TokenType.Identifier);
        return identifier;
    }

    // 解析表达式
    private _parseExpression(): TExpression {
        // 先检查是否是一个函数表达式
        //if (this._checkCurrentTokenType(TokenType.Function)) {
            return this._parseFunctionExpression();
       // }
        // TODO:....
    }

    // 2. 解析函数表达式，其实就是填充 FunctionExpression 接口
    private _parseFunctionExpression(): FunctionExpression {
        // 获取当前 token
        const { start } = this._getCurrentToken();
        // 消费当前 token
        this._goNext(TokenType.Function);

        let id = null;
        // 检查消费过后，节点类型是否是 Identifier 类型，即函数声明 function func
        // 否则就是表达式声明 即 let a = function(){}
        if (this._checkCurrentTokenType(TokenType.Identifier)) {
            id = this._parseIdentifier();
        }
        // 解析函数参数
        const params = this._parseParams();
        // 解析函数体
        const body = this._parseBlockStatement();
        // 构造节点
        const node: FunctionExpression = {
            type: NodeType.FunctionExpression,
            id,
            params,
            body,
            start,
            end: body.end,
        };
        return node;
    }

    // 用于解析函数参数
    private _parseParams(): Identifier[] | Expression[] {
        // 消费 "("
        this._goNext(TokenType.LeftParen);
        const params = [];
        // 逐个解析括号中的参数
        while (!this._checkCurrentTokenType(TokenType.RightParen)) {
            let param = this._parseIdentifier();
            params.push(param);
        }
        // 消费 ")"
        this._goNext(TokenType.RightParen);
        return params;
    }

    // 用于解析函数体
    private _parseBlockStatement(): BlockStatement {
        const { start } = this._getCurrentToken();
        const blockStatement: BlockStatement = {
            type: NodeType.BlockStatement,
            body: [],
            start,
            end: Infinity,
        };
        // 消费 "{"
        this._goNext(TokenType.LeftCurly);
        while (!this._checkCurrentTokenType(TokenType.RightCurly)) {
            // 递归调用 _parseStatement 解析函数体中的语句(Statement)
            const node = this._parseStatement();
            blockStatement.body.push(node);
        }
        blockStatement.end = this._getCurrentToken().end;
        // 消费 "}"
        this._goNext(TokenType.RightCurly);
        return blockStatement;
    }

    // token 是否已经扫描完
    private _isEnd(): boolean {
        console.log(this._currentIndex,this._tokens.length)
        return this._currentIndex >= this._tokens.length;
    }

    // 工具方法，表示消费当前 Token，扫描位置移动到下一个 token
    private _goNext(type: TokenType | TokenType[]): Token {
        const currentToken = this._tokens[this._currentIndex];
        console.log(currentToken.type, type)
        // 断言当前 Token 的类型，如果不能匹配，则抛出错误
        if (Array.isArray(type)) {
            if (!type.includes(currentToken.type)) {
                throw new Error(
                    `Expect ${type.join(",")}, but got ${currentToken.type}`
                );
            }
        } else {
            if (currentToken.type !== type) {
                throw new Error(`Expect ${type}, but got ${currentToken.type}`);
            }
        }
        // 相等则消费 token，指针前进，并返回当前指向的 token （指针前进前）
        this._currentIndex++;
        return currentToken;
    }

    // 检查当前指向的词法分析 token 类型
    private _checkCurrentTokenType(type: TokenType | TokenType[]): boolean {
        if (this._isEnd()) {
            return false;
        }
        // 根据当前指向的 token 判断传入的 type 是否和 token 类型相同
        const currentToken = this._tokens[this._currentIndex];
        if (Array.isArray(type)) {
            return type.includes(currentToken.type);
        } else {
            return currentToken.type === type;
        }
    }

    // 获得当前指向的词法分析 token
    private _getCurrentToken(): Token {
        return this._tokens[this._currentIndex];
    }

    // 获得相对当前指向的前一个词法分析 token
    private _getPreviousToken(): Token {
        return this._tokens[this._currentIndex - 1];
    }

    // 获得相对当前指向的下一个词法分析 token
    private _getNextToken(): Token | false {
        if (this._currentIndex + 1 < this._tokens.length) {
            return this._tokens[this._currentIndex + 1];
        } else {
            return false;
        }
    }
}
