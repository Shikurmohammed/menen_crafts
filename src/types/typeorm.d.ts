// This tells TypeScript where to find TypeORM types
declare module 'typeorm' {
    export * from 'typeorm/index';
}

declare module 'typeorm/browser' {
    export * from 'typeorm';
}