const cstdio = `
void puts(string out) {
    @output(out);
}

void printf(string out) {
    @outputWithFormat( @arguments() );
}

`;

export {
    cstdio
};