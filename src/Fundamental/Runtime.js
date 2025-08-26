import { ControllType } from "./Constant";

import * as RuntimeType from 'runtime';

const createArray = (sizes, curr, defaultValue) => {
    const ret = [];
    if(curr + 1 == sizes.length) {
        for(let i = 0; i < sizes[curr]; i++) {
            ret.push(defaultValue);
        }
        return ret;
    }
    for(let i = 0; i < sizes[curr]; i++) {
        ret.push(createArray(sizes, curr+1, defaultValue));
    }
    return ret;
}

class Runtime {
    /**
     * @param {AST} AST 
     */
    constructor(AST) {
        this.AST = AST;
        this.output = "";
        this.stack = {arr: []};
        this.symbolTable = new Map();
        this.stack = [];
        this.globalVariables = new Map();
    }

    async setValue(exp1, exp2, st) {
        let varibleName = exp1.content;
        const symbolTable = st || this.symbolTable;
        if(exp1.type === RuntimeType.postfix) {


            varibleName = varibleName.content;
            const varibaleRaw = symbolTable.get(varibleName);
            let variable = varibaleRaw;
            
            let postfix = exp1.sign;

            while(postfix.inner) {
                const index = (await this.excute(postfix.parserIndex)).result;
                variable = variable[index];
                postfix = postfix.inner;
            }
            let index;
            if(postfix.type == 'struct') {
                index = postfix.record;
            } else {
                index = (await this.excute(postfix.parserIndex)).result;
            }
            variable[index] = exp2;
        } else {
            if(symbolTable.has(varibleName))
                symbolTable.set(varibleName, exp2);
            else
                this.globalVariables.set(varibleName, exp2);
        }
    }

    async binaryOp(exp1, exp2, sign) {
        switch(sign) {
            case '+':
                return exp1.result+exp2.result;
            case '-':
                return exp1.result-exp2.result;
            case '*':
                return exp1.result*exp2.result;
            case '/':
                return exp1.result/exp2.result;
            case '%':
                return exp1.result%exp2.result;
            case '<<':
                return exp1.result<<exp2.result;
            case '>>':
                return exp1.result>>exp2.result;
            case '^':
                return exp1.result^exp2.result;
            case '|':
                return exp1.result|exp2.result;
            case '||':
                return exp1.result||exp2.result;
            case '&&':
                return exp1.result&&exp2.result;
            case '&':
                return exp1.result&exp2.result;
            case '<':
                return exp1.result<exp2.result?1:0;
            case '>':
                return exp1.result>exp2.result?1:0;
            case '<=':
                return exp1.result<=exp2.result?1:0;
            case '>=':
                return exp1.result>=exp2.result?1:0;
            case '=':
                await this.setValue(exp1.result, exp2.result);
                return exp2.result;
            case '==':
                return exp1.result==exp2.result?1:0;
            default:
                if (sign.endsWith('=')) {
                    const op = sign.substring(0, sign.length - 1);
                    const newExp2 = await this.excute({type: RuntimeType.binaryOp, content: [exp1.result, {type: RuntimeType.number, content: exp2.result}], sign: op});
                    await this.setValue(exp1.result, newExp2.result);
                    return exp2.result;
                }
        }
    }


    /**
     * @param {ForAST} currentNode 
     * @returns 
     */
    async excuteFor(currentNode) {
        await this.excute(currentNode.initial);
        let condition = await this.excute(currentNode.condition);
        let currResult = null;
        let currState = {controllState: ControllType.normal};
        while(condition.result != 0) {
            const {state, result} = await this.excute(currentNode.body);
            if(state.controllState == ControllType.returnState) {
                currResult = result;
            }
            if(state.controllState == ControllType.returnState || state.controllState == ControllType.breakState) {
                currState = state;
                break;
            }
            await this.excute(currentNode.increment);
            condition = await this.excute(currentNode.condition);
        }
        if(currState.controllState == ControllType.breakState || currState.controllState == ControllType.continueState) {
            currState.controllState = ControllType.normal;
        }
        return {result: currResult, state: currState};
    }

    /**
     * @param {VariableAST} currentNode 
     * @returns 
     */
    async excuteVariable(currentNode) {
        let variable = this.symbolTable.get(currentNode.content);
        if(variable===undefined)variable = this.globalVariables.get(currentNode.content);
        return {result: variable, state: {controllState: ControllType.normal}};
    }


    /**
     * @param {InvokeAST} node 
     * @returns 
     */
    async excuteBuildin(node) {
        switch(node.functionName) {
            case '@output':
                for(const arg of node.argus) {
                    const {result} = await this.excute(arg);
                    this.output += result;
                }
                break;
            case '@arguments':
                return {result: this.symbolTable.get('@arguments')}

            case '@input':
                const {result: argus} = await this.excute(node.argus[0]);

                for(let i = 1; i < argus.length; i++) {
                    const arg = argus[i];
                    const input = this.input?.shift();
                    //arg?.mp?.set(arg.content, parseInt(input));
                    this.setValue(arg.variable, parseInt(input), arg.mp);
                }
                return {result: 1, state: {controllState: ControllType.normal}}
            case '@outputWithFormat':
                {
                    const {result: argus} = await this.excute(node.argus[0]);
                    const argument = argus;
                    let output = argument[0];
                    for(let i = 1; i < argument.length; i++) {
                        output = output.replace('%d', argument[i]);
                    }

                    this.output += output;
                }
                break;
            default:
                break;
        }
        return {result: null, state: {controllState: ControllType.normal}};
    }

    /**
     * @param {ProgramAST} currentNode 
     * @returns 
     */
    async excuteProgram(currentNode) {
        for(const gvariables of currentNode.globals) {
            await this.excute(gvariables);
        }

        this.globalVariables = this.symbolTable;
        this.structs = currentNode.structs;
        this.functionTable = currentNode.functions;
        const {state} = await this.excute(currentNode.main);
        return {result : null, state};
    }

    /**
     * @param {BlockAST} currentNode 
     * @returns 
     */
    async excuteBlock(currentNode) {
        this.stack.push("block");
        let currentState = {controllState: ControllType.normal};
        let currentResut = null;
        for(const child of currentNode.content) {
            const {result, state} = await this.excute(child);
            if(state.controllState == ControllType.returnState) {
                currentResut = result;
            }
            if(state.controllState != ControllType.normal) {
                currentState = state;
                break;
            }
        }
        while(true) {
            const last = this.stack.pop();
            if(last == 'block')break;
            this.symbolTable.delete(last);
        }
        return {result : currentResut, state: currentState};
    }

    /**
     * @param {FunctionAST} currentNode 
     * @param {Object} argus 
     * @returns 
     */
    async excuteFunction(currentNode, argus) {
        this.stack.push(currentNode.functionName);
        const paras = currentNode.parameters;
        const symbolTable = this.symbolTable;
        this.symbolTable = new Map();
        this.symbolTable.set(`@arguments`, argus);
        for(let i = 0; i < paras.length; i++) {
            const para = paras[i].variable.content;
            if(para === '...') {
                break;
            }
            this.stack.push(currentNode.functionName);
            this.symbolTable.set(para, argus[i]);
        }

        const {state, result} = await this.excute(currentNode.body);

        while(true) {
            const last = this.stack.pop();
            if(last == currentNode.functionName)break;
            this.symbolTable.delete(last);
        }

        this.symbolTable = symbolTable;
        state.controllState = ControllType.normal;

        return {result, state};
    }

    /**
     * @param {ReturnAST} currentNode 
     * @returns 
     */
    async excuteReturn(currentNode) {
        const {result} = await this.excute(currentNode.content);
        return {result, state: {controllState: ControllType.returnState}};
    }

    /**
     * @param {InvokeAST} currentNode 
     * @returns 
     */
    async excuteInvoke(currentNode) {
        const func = this.functionTable.get(currentNode.functionName);
        const argus = [];
        for(const argu of currentNode.argus) {
            const {result, state} = await this.excute(argu);
            argus.push(result);
        }
        const {result, state} = await this.excute(func, argus);
        return {result, state};
    }

    async getType(type) {
        if(type.type == RuntimeType.arrayDeclearation) {
            const length = (await this.excute(type.parserIndex)).result;
            const ret = [];
            const inner = await this.getType(type.inner);
            for(let i = 0; i < length; i++) {
                ret.push(inner === 0 ? 0:await this.getType(type.inner));
            }
            return ret;
        } else if(type.type == RuntimeType.POD) {
            return 0;
        } else if(type?.type == 'struct') {
            const struct = this.structs.get(type.name).content;
            console.info(struct);
            const res = {};
            for(let i = 0; i < struct.length; i++) {
                res[struct[i].content[0][0].content] = 0;
            }
            return res;
        }
    }

    /**
     * @param {PostfixAST} currentNode 
     * @returns 
     */
    async excuteArray(currentNode) {
        let arr = currentNode.sign;
        let variable = await this.excute(currentNode.content);
        //if(!variable) variable = this.globalVariables.get(varibleName);
        let value = variable.result;
        while(arr && arr.type == "array") {
            const index = (await this.excute(arr.parserIndex)).result;
            value = value[index];
            arr = arr.inner;
        }
        if(arr?.type == 'struct') {
            const index = arr.record;
            value = value[index];
        }
        return {result: value, state: {controllState: ControllType.normal}};
    }

    /**
     * @param {PostfixAST} currentNode 
     * @returns 
     */
    async excuteStruct(currentNode) {
        const varibleName = currentNode.content.content;
        let record = currentNode.sign.record;
        const variable = this.symbolTable.get(varibleName);
        let value = variable[record];

        return {result: value, state: {controllState: ControllType.normal}};
    }

    /**
     * @param {DeclearationAST} currentNode 
     * @returns 
     */
    async excuteDeclearation(currentNode) {
        for(const assignment of currentNode.content) {
            const type = assignment[2];
            const variable = assignment[0].content;
            const defaultValue = await this.getType(type);

            if(assignment[1]) {
                const exp = await this.excute(assignment[1]);
                this.symbolTable.set(variable, exp.result);
            } else {
                this.symbolTable.set(variable, defaultValue);
            }

            this.stack.push(variable);
        }
        return {result: null, state: {controllState: ControllType.normal}};
    }


    async excuteHelper(currentNode, argus) {
        if(this.config && this.config.debug) {
            if(this.currentLine != currentNode.lineNum && currentNode.lineNum != -1 && currentNode.type != RuntimeType.blocks) {
                this.currentLine = currentNode.lineNum;
                await this.config.debugCallback({
                    currentNode,
                    symbolTable: this.symbolTable,
                    stack: this.stack,
                    output: this.output,
                    globalVariables: this.globalVariables,
                });
            }
        }
        switch(currentNode.type) {
            case RuntimeType.program:
                return this.excuteProgram(currentNode);
            case RuntimeType.functionStmt:
                return this.excuteFunction(currentNode,argus);
            case RuntimeType.buildin:
                return this.excuteBuildin(currentNode);
            case RuntimeType.returnStmt:
                return this.excuteReturn(currentNode);
            case RuntimeType.string:
                return {result: currentNode.content, state: {controllState: ControllType.normal}};
            case RuntimeType.invoke:
                return this.excuteInvoke(currentNode);
            case RuntimeType.breakStmt:
                return {result : null, state: {controllState: ControllType.breakState}};
            case RuntimeType.continueStmt:
                return {result : null, state: {controllState: ControllType.continueState}};
            case RuntimeType.blocks:
                return await this.excuteBlock(currentNode);
            case RuntimeType.arrayDeclearation:
                return await this.excuteBlock(currentNode);
            case RuntimeType.array:
                return this.excuteArray(currentNode);
            case RuntimeType.binaryOp:
                {
                    const exp1 = await this.excute(currentNode.content[0]);
                    const exp2 = await this.excute(currentNode.content[1]);
                    const result = await this.binaryOp(exp1, exp2, currentNode.sign);
                    return {result, state: {controllState: ControllType.normal}};
                }
            case RuntimeType.number:
                return {result: parseInt(currentNode.content), state: {controllState: ControllType.normal}};
            case RuntimeType.declearation:
                return this.excuteDeclearation(currentNode);
            case RuntimeType.variable:
                return this.excuteVariable(currentNode);

            case RuntimeType.lValue:
                return {result: currentNode.content, state: {controllState: ControllType.normal}};
            case RuntimeType.lValue:
                {
                    const {state, result: variable} = await this.excute(currentNode.name);
                    let ele = variable;

                    for(const index of currentNode.arr) {
                        const {state, result} = await this.excute(index);
                        ele = ele[result];
                    }

                    return {result: ele, state};
                }
            case RuntimeType.ifStmt:
                {
                    const condition = await this.excute(currentNode.condition);
                    if(condition.result != 0) {
                        return this.excute(currentNode.body);
                    }
                    if(currentNode.elif)
                        for(const elif of currentNode.elif) {
                            const condition = await this.excute(elif.condition);
                            if(condition.result != 0) {
                                return this.excute(elif.body);
                            }
                        }
                    
                    if(currentNode.elses) {
                        return this.excute(currentNode.elses);
                    }
                }
            case RuntimeType.whileStmt:
                {
                    let condition = await this.excute(currentNode.condition);
                    let currState = {controllState: ControllType.normal};
                    let currResult = null;
                    while(condition.result != 0) {
                        const {state, result} = await this.excute(currentNode.body);
                        currState = state;
                        if(state.controllState == ControllType.returnState) {
                            currResult = result;
                        }
                        if(state.controllState == ControllType.returnState || state.controllState == ControllType.breakState)break;
                        condition = await this.excute(currentNode.condition);
                    }
                    if(currState.controllState == ControllType.breakState || currState.controllState == ControllType.continueState) {
                        currState.controllState = ControllType.normal;
                    }
                    return {result: currResult, state: currState};
                }
            case RuntimeType.forStmt:
                return await this.excuteFor(currentNode);
            case RuntimeType.postfix: 
                {
                    if(currentNode.sign == '++') {
                        const content = await this.excute(currentNode.content);
                        await this.setValue(currentNode.content, content.result+1);
                        //this.symbolTable.set(currentNode.content.content, content.result+1);
                        return {result: content.result, state: content.state};
                    } else if(currentNode.sign == '--') {
                        const content = await this.excute(currentNode.content);
                        await this.setValue(currentNode.content, content.result-1);
                        //this.symbolTable.set(currentNode.content.content, content.result-1);
                        return {result: content.result, state: content.state};
                    } else if(currentNode.sign.type == 'struct') {
                        return this.excuteStruct(currentNode);
                    } else {
                        return this.excuteArray(currentNode);
                    }
                }
            case RuntimeType.prefix: 
                {
                    if(currentNode.sign == '++') {
                        const content = await this.excute(currentNode.content);
                        this.symbolTable.set(currentNode.content.content, content.result+1);
                        return {result: content.result, state: content.state};
                    }
                    if(currentNode.sign == '--') {
                        const content = await this.excute(currentNode.content);
                        this.symbolTable.set(currentNode.content.content, content.result-1);
                        return {result: content.result, state: content.state};
                    }
                    if(currentNode.sign == '-') {
                        const content = await this.excute(currentNode.content);
                        return {result: -content.result, state: content.state};
                    }
                    if(currentNode.sign == '+') {
                        const content = await this.excute(currentNode.content);
                        return {result: content.result, state: content.state};
                    }
                    if(currentNode.sign == '&') {
                        const content = currentNode.content;
                        return {result: {
                            mp: this.symbolTable,
                            content: content.content,
                            variable: content
                        }, state: {controllState: ControllType.normal}};
                    }
                }
            case RuntimeType.arrayVariable:
                {
                    const content = currentNode.content;
                    let arr = [];
                    for(const index of content) {
                        const {result} = await this.excute(index);
                        arr.push(result);
                    }
                    return {result: arr, state: content.state};
                }
            case RuntimeType.ternaryOp:
                {
                    if(currentNode.sign == '?') {
                        const condition = await this.excute(currentNode.content[0]);
                        if(condition.result > 0) {
                            const content = await this.excute(currentNode.content[1]);
                            return {result: content.result, state: content.state};
                        } else {
                            const content = await this.excute(currentNode.content[2]);
                            return {result: content.result, state: content.state};
                        }
                    }
                }
            default:
                break;
        }
    }

    /**
     * 
     * @param {Object} currentNode 
     * @param {Object | null} [argus=null]
     * @returns 
     */
    async excute(currentNode, argus) {
        return await this.excuteHelper(currentNode, argus);
    }


    /**
     * 
     * @param {string} input 
     * @param {*} config 
     * @returns 
     */
    async launch(input, config) {
        if(!config)this.config = {};
        this.config = config;
        this.input = input?.split(/[\n\s]/);
        this.currentLine = 0;
        await this.excuteProgram(this.AST);
        return {output: this.output.replaceAll('\\n', '\n')};
    }
}

export {
    Runtime
}