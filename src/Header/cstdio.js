const cstdio = `
void puts(string out) {
    @output(out);
}

void printf(string out) {
    @outputWithFormat( @arguments() );
}

void scanf(string out) {
    @input( @arguments() );
}

int max(int x, int y) {
    return x > y ? x : y;
}


int min(int x, int y) {
    return x < y ? x : y;
}

`;

export {
    cstdio
};