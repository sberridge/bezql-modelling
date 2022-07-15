import IRelation from './IRelation';
import BaseModel from '../BaseModel';
import QueryConstraints from './../QueryConstraints';
import ModelCollection from '../ModelCollection';
import SQLResult from './../SQLResult';
import ModelDB from './../ModelDB';

export default class BelongsTo<TModel extends BaseModel = BaseModel> implements IRelation {
    private primaryModel: BaseModel;
    private foreignModel: BaseModel;
    private foreignKey: string;
    private query: ModelDB;
    public returnsMany: boolean = false;

    constructor(primaryModel: BaseModel, foreignFunc: new (...args: any[]) => BaseModel, foreignKey: string) {
        this.primaryModel = primaryModel;
        this.foreignModel = new foreignFunc();
        this.foreignKey = foreignKey;
        this.query = this.generateQuery();
    }

    public getQuery(applyWhere:boolean):ModelDB
    public getQuery(): ModelDB
    public getQuery(applyWhere:boolean = true): ModelDB {
        if(applyWhere) {
            this.query.where("__primary__." + this.primaryModel.getPrimaryKey(),"=",this.primaryModel.getColumn(this.primaryModel.getPrimaryKey()), true);
        }
        return this.query;
    }

    public generateQuery(): ModelDB {
        var daQuery = new ModelDB(this.primaryModel.getSqlConfig());
        if(!daQuery) {
            throw("No database found");
        }
        daQuery.toModel(this.foreignModel.constructor as new (...args: any[]) => BaseModel);
        var self = this;
        daQuery.table(this.primaryModel.getTable() + " __primary__");
        var selectCols = ["__primary__." + this.primaryModel.getPrimaryKey() + " __table_" + this.primaryModel.getTable() + "__key"];
        this.foreignModel.getSelectColumns().forEach((col)=>{
            selectCols.push(col);
        });
        daQuery.cols(selectCols);

        daQuery.join(this.foreignModel.getTable(), (query: QueryConstraints)=>{
            query.on("__primary__." + self.foreignKey, "=", self.foreignModel.getTable() + "." + self.foreignModel.getPrimaryKey());
            return query;
        });
        return daQuery
    }

    private async getUnfilteredResult() {
        let daQuery = this.query;
        daQuery.where("__primary__." + this.primaryModel.getPrimaryKey(),"=",this.primaryModel.getColumn(this.primaryModel.getPrimaryKey()), true);
        let results = await daQuery.fetchModels<TModel>();
        let model = results.first();
        return model;
    }

    private async getFilteredResult(ids:any[]) {
        let daQuery = this.query;
        daQuery.whereIn("__primary__." + this.primaryModel.getPrimaryKey(),ids, true);
        let results = await daQuery.fetch()
        var groupedResults:{[key:string]:BaseModel} = {};
        var modelConstructor: any = this.foreignModel.constructor;
        results.rows.forEach(result=>{
            if(!(result["__table_" + this.primaryModel.getTable() + "__key"] in groupedResults)) {
                var resModel: BaseModel = new modelConstructor();
                if(!resModel.getSqlConfig()) {
                    resModel.setSqlConfig(this.primaryModel.getSqlConfig());
                }
                resModel.loadData(result);
                resModel.setVisibleColumns(Object.keys(result));
                groupedResults[result["__table_" + this.primaryModel.getTable() + "__key"]] = resModel as TModel;
            }
        });
        return results;
    }

    public getResult(ids: any[]): Promise<SQLResult<any>>
    public getResult(): Promise<TModel>
    public getResult(ids: any[] | null = null): Promise<any> {
        return new Promise(async (resolve,reject)=>{            
            if(ids !== null) {
                resolve(await this.getFilteredResult(ids));
            } else {
                resolve(await this.getUnfilteredResult());
            }            
            
        });            
    }

    private async getFilteredResults(ids:any[]) {
        let daQuery = this.query;
        daQuery.whereIn("__primary__." + this.primaryModel.getPrimaryKey(),ids, true);
        let results = await daQuery.fetch()
        let groupedResults:{[key:string]:ModelCollection<TModel>} = {};
        let modelConstructor: any = this.foreignModel.constructor;
        results.rows.forEach(result=>{
            if(!(result["__table_" + this.primaryModel.getTable() + "__key"] in groupedResults)) {
                groupedResults[result["__table_" + this.primaryModel.getTable() + "__key"]] = new ModelCollection<TModel>;
            }
            let resModel: BaseModel = new modelConstructor();
            if(!resModel.getSqlConfig()) {
                resModel.setSqlConfig(this.primaryModel.getSqlConfig());
            }
            resModel.loadData(result);
            resModel.setVisibleColumns(Object.keys(result));
            groupedResults[result["__table_" + this.primaryModel.getTable() + "__key"]].add(resModel as TModel);
        });

        return groupedResults;
    }

    private async getUnfilteredResults() {
        let daQuery = this.query;
        daQuery.where("__primary__." + this.primaryModel.getPrimaryKey(),"=",this.primaryModel.getColumn(this.primaryModel.getPrimaryKey()), true);
        let results = await daQuery.fetchModels<TModel>();
        return results;
    }

    public getResults(ids: any[]): Promise<{[key:string]:ModelCollection<TModel>}>
    public getResults(): Promise<ModelCollection<TModel>>
    public getResults(ids: any[] | null = null): Promise<any> {
        return new Promise(async (resolve,reject)=>{
            if(ids !== null) {
                resolve(await this.getFilteredResults(ids));
            } else {
                resolve(await this.getUnfilteredResults());
            }                        
        });            
    }

}
