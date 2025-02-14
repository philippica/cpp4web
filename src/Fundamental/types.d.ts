
interface Token {
    type: number;
    content: string;
    line: number;
}

type TokenStream = Array<Token>;

type Parser = import('./Parser').Parser;

type ParserFunction = (parser: Parser) => Parser;


enum RuntimeType {
    variable,
    binaryOp,
    array,
    arrayDeclearation,
    prefix,
    ternaryOp,
    declearation,
    forStmt,
    doStmt,
    breakStmt,
    continueStmt,
    returnStmt,
    blocks,
    functionStmt,
    program,
    buildin,
    invoke,
    whileStmt,
    number,
    Empty,
    type,
    POD,
    struct,
    string,
    ifStmt,
    postfix,
    lValue,
};


type BinaryOpAST = {
    type: RuntimeType.binaryOp;
    sign: string;
    content: Array<AST>;
}

type NumberAST = {
    type: RuntimeType.number;
    content: string;
}

type ForAST = {
    type: RuntimeType.forStmt; 
    initial: AST;
    condition: AST;
    increment: AST;
    body: AST;
}

type WhileAST = {
    type: RuntimeType.whileStmt; 
    condition: AST;
    body: AST;
}

type BreakAST = {
    type: RuntimeType.breakStmt; 
}


type BlockAST = {
    type: RuntimeType.blocks;
    content: Array;
}

type DoAST = {
    type: RuntimeType.doStmt;
    condition: AST;
    body: AST;
}

type ReturnAST = {
    type: RuntimeType.returnStmt;
    content: AST;
}

type ContinueAST = {
    type: RuntimeType.continueStmt;
}

type BreakAST = {
    type: RuntimeType.breakStmt;
}

type FunctionAST = {
    type: RuntimeType.functionStmt;
    functionName: string;
    returnType: AST;
    parameters: Array;
    body: AST;
}

type VariableAST = {
    type: RuntimeType.variable;
    T: AST;
    content: AST
}

type PrefixAST = {
    type: RuntimeType.prefix;
    sign: String;
    content: AST
}

type ArrayDeclearationAST = {
    type: RuntimeType.arrayDeclearation;
    parserIndex: AST;
    inner: AST
}

type TypeAST = {
    type: RuntimeType.type;
    T: TAST;
}

type InvokeAST = {
    type: RuntimeType.invoke | RuntimeType.buildin;
    functionName: string;
    argus: Array;
}

type ProgramAST = {
    type: RuntimeType.program;
    globals: Array;
    functions: Array;
    main: AST;
    structs: Array;
}

type TernaryAST = {
    type: RuntimeType.ternaryOp;
    sign: string;
    content: Array;
}

type TAST = {
    type: number,
    name: Array
};

type DeclearationAST = {
    type: RuntimeType.declearation,
    content: Array
};

type StringAST = {
    type: RuntimeType.string,
    content: string;
};


type IfAST = {
    type: RuntimeType.ifStmt,
    condition: AST,
    body: AST,
    elif: Array,
    elses: Array
}

type ArrayAST = {
    type: RuntimeType.array,
    parserIndex: string,
    inner: AST,
};


type EmptyAST = {
    type: RuntimeType.Empty;
}

type PostfixAST = {
    type: RuntimeType.postfix;
    sign: string,
    content: AST
}

type LValueAST = {
    type: RuntimeType.lValue;
    content: AST
}




type AST = BinaryOpAST
         | LValueAST 
         | NumberAST 
         | ForAST
         | DoAST
         | PrefixAST
         | WhileAST
         | DeclearationAST
         | TernaryAST
         | BreakAST
         | ContinueAST
         | ReturnAST
         | VariableAST
         | FunctionAST
         | BlockAST
         | InvokeAST
         | StringAST
         | TypeAST
         | ProgramAST
         | EmptyAST
         | IfAST
         | PostfixAST
         | ArrayDeclearationAST
         | ArrayAST

type mAST = AST & {
    lineNum?: number;
};