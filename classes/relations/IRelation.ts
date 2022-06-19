import BaseModel from './../BaseModel';
import ModelCollection from './../ModelCollection';
import SQLResult from 'bezql/lib/classes/SQLResult';
import ModelDB from './../ModelDB';

export default interface IRelation {
    returnsMany: boolean;
    generateQuery(): any
    
    getQuery(applyWhere:boolean): ModelDB
    getQuery(): ModelDB

    getResult(ids: any[]): Promise<SQLResult>
    getResult(): Promise<BaseModel>
    
    getResults(ids: any[]): Promise<{[key:string]:ModelCollection}>
    getResults(): Promise<ModelCollection>
}
    