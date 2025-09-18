const keyWords = ["int", "void", "double", "float", "short", "char", "bool", "long", "signed", "unsigned", "string",
"asm","do","if","return","typedef","auto","inline","typeid","dynamic_cast","typename",
"break","else","sizeof","union","case","enum","mutable","static","catch","explicit","namespace","static_cast",
"using","export","new","struct","virtual","class","extern","operator","switch","const","false","private","template",
"volatile","const_cast","protected","wchar_t","continue","for","public","throw","while","default","friend","register","true",
"delete","goto","reinterpret_cast","try",];

const signs = ["==", "<<=", ">>=", "*=", "+=", "~=", "-=", "/=", "|=", "^=", "%=", "&=", "=", "<<", ">>", "#", "::", "?", ":", ">=", "<=", 
"<", ">", "(", ")", "->", '...','"',"'", "!=", '++', '--',
"{", "}", ',', '+', '-', '*', '/', '~','||', '&&', '|', '&', '^', '%', '!', '[', ']', '.'];

const TokenType = {
    identifier: 0,
    number: 1,
    keyword: 2,
    sign: 3,
    string: 4,
    buildin: 5,
    semicolon: 6,
    char: 7,
};


const ControllType = {
    normal: 0,
    continueState: 1,
    breakState: 2,
    returnState: 3,
};


/** @typedef {'TYPE_A'|'TYPE_B'} RuntimeTypeKeys */

export{
    TokenType,
    ControllType,
    keyWords,
    signs
}