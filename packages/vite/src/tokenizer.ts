/**
 * 词法分析
 */
// 语义规则
export enum TokenType {
    // let
    Let = "Let",
    // =
    Assign = "Assign",
    // function
    Function = "Function",
    // 变量名
    Identifier = "Identifier",
    // (
    LeftParen = "LeftParen",
    // )
    RightParen = "RightParen",
    // {
    LeftCurly = "LeftCurly",
    // }
    RightCurly = "RightCurly",
    Const = "Const",
    Var = "Var",
    Number = "Number",
    Operator = "Operator",
    Comma = "Comma",
    Dot = "Dot",
    Semicolon = "Semicolon",
    StringLiteral = "StringLiteral",
    Return = "Return",
    Import = "Import",
    Export = "Export",
    Default = "Default",
    From = "From",
    As = "As",
    Asterisk = "Asterisk",
}
// 词法分析 token 对象
export type Token = {
    type: TokenType;
    value?: string;
    start: number;
    end: number;
    raw?: string;
};

/**
 * token 生成器对象，包含各个语义的相应 token 对象生成方法
 */
const TOKENS_GENERATOR: Record<string, (...args: any[]) => Token > = {
    // let Token
    // 结束 end = start + token的字符长度
    let(start: number) {
        return { type: TokenType.Let, value: "let", start, end: start + 3 };
    },
    // = Token
    assign(start: number) {
        return { type: TokenType.Assign, value: "=", start, end: start + 1 };
    },
    // function Token
    function(start: number) {
        return {
            type: TokenType.Function,
            value: "function",
            start,
            end: start + 8,
        };
    },
    // ( Token
    leftParen(start: number) {
        return { type: TokenType.LeftParen, value: "(", start, end: start + 1 };
    },
    // ) Token
    rightParen(start: number) {
        return { type: TokenType.RightParen, value: ")", start, end: start + 1 };
    },
    // { Token
    leftCurly(start: number) {
        return { type: TokenType.LeftCurly, value: "{", start, end: start + 1 };
    },
    // } Token
    rightCurly(start: number) {
        return { type: TokenType.RightCurly, value: "}", start, end: start + 1 };
    },
    // 变量名 Token
    identifier(start: number, value: string) {
        return {
            type: TokenType.Identifier,
            value,
            start,
            end: start + value.length,
        };
    },
}

// 单个字符token类型
type SingleCharTokens = "(" | ")" | "{" | "}" | "=";

// 单字符到 Token 生成器的映射
// 这个 map 直接映射 单个字符和对应的生成器方法
const KNOWN_SINGLE_CHAR_TOKENS = new Map<
    SingleCharTokens,
    typeof TOKENS_GENERATOR[keyof typeof TOKENS_GENERATOR]
    >([
    ["(", TOKENS_GENERATOR.leftParen],
    [")", TOKENS_GENERATOR.rightParen],
    ["{", TOKENS_GENERATOR.leftCurly],
    ["}", TOKENS_GENERATOR.rightCurly],
    ["=", TOKENS_GENERATOR.assign],
]);

// 词法分析器
export class Tokenizer {
    // 分析的 token 对象结果列表
    private _tokens: Token[] = [];
    // 当前字符索引
    private _currentIndex: number = 0;
    // 源码
    private _source: string;
    constructor(input: string) {
        this._source = input;
    }
    // 分析入口方法
    tokenize(): Token[] {
        // 根据原始输入字符，循环用一个指针挨个便利
        while (this._currentIndex < this._source.length) {
            // 当前字符
            let currentChar = this._source[this._currentIndex];
            // 开始位置
            const startIndex = this._currentIndex;

            // 根据语法规则进行 token 分组

            const isAlpha = (char: string): boolean => {
                return (char >= "a" && char <= "z") || (char >= "A" && char <= "Z");
            }

            // 1. 处理空格，直接前进
            if (currentChar === ' ') {
                this._currentIndex++;
                continue;
            }
            // 2. 处理字母
            else if (isAlpha(currentChar)) {
                // 普通字母时，创建一个变量字符，
                let identifier = '';
                // 继续前进字符，并拼接 identifier
                while(isAlpha(currentChar)) {
                    identifier += currentChar;
                    this._currentIndex ++;
                    currentChar = this._source[this._currentIndex];
                }
                // 遇到非普通字符时，上述循环停止

                let token: Token;
                // 此时判断 identifier 是否为 token 词法的关键字 'let','function'....
                if (identifier in TOKENS_GENERATOR) {
                    // 如果是关键字,调用生成器
                    token =
                        TOKENS_GENERATOR[identifier as keyof typeof TOKENS_GENERATOR](
                            startIndex
                        );
                } else {
                    // 如果是普通标识符，调用 identifier 生成器，即这个字符串 是一个变量名
                    token = TOKENS_GENERATOR["identifier"](startIndex, identifier);
                }
                this._tokens.push(token);
                continue;
            }
            // 3. 处理单字符，当前字符存在于单字符 map 中，命中匹配，直接调用对应生成器方法，创建 token
            else if(KNOWN_SINGLE_CHAR_TOKENS.has(currentChar as SingleCharTokens)) {
                // 直接调用对应生成器方法，创建 token
                const token = KNOWN_SINGLE_CHAR_TOKENS.get(
                    currentChar as SingleCharTokens
                )!(startIndex);
                this._tokens.push(token);
                // 前进
                this._currentIndex++;
                continue;
            }
        }
        return this._tokens;
    }
}
