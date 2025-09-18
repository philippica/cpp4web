const iostream = `
struct OStream {
    OStream operator<<(string s) {
        printf(s);
        return this;
    }
};

OStream cout;
struct IStream {
    IStream operator>>(int x) {
        scanf("%d", &x);
        return this;
    }
};
IStream cin;

int max(int x, int y) {
    return x > y ? x : y;
}


int min(int x, int y) {
    return x < y ? x : y;
}
`;

export {
    iostream
};