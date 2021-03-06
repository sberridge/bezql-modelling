import BaseModel from './../BaseModel';
import ModelCollection from './../ModelCollection';
import SQLResult from '../SQLResult';
import ModelDB from './../ModelDB';

export default interface IRelation {
    returnsMany: boolean;
    generateQuery(): any
    
    getQuery(applyWhere:boolean): ModelDB
    getQuery(): ModelDB

    getResult<TModel extends BaseModel>(ids: any[]): Promise<SQLResult<TModel>>
    getResult(): Promise<BaseModel>
    
    getResults<TModel extends BaseModel>(ids: any[]): Promise<{[key:string]:ModelCollection<TModel>}>
    getResults<TModel extends BaseModel>(): Promise<ModelCollection<TModel>>
}
    