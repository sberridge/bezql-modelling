import IRelation from './IRelation';
import BaseModel from '../BaseModel';
import QueryConstraints from 'bezql/lib/classes/QueryConstraints';
import ModelCollection from '../ModelCollection';
import SQLResult from 'bezql/lib/classes/SQLResult';
import ModelDB from './../ModelDB';

export default class BelongsToMany implements IRelation {
    private primaryModel: BaseModel;
    private foreignModel: BaseModel;
    private linkTable: string;
    private primaryForeignKey: string;
    private secondaryForeignKey: string;
    private query: ModelDB;
    private linkColumns: string[] | undefined;
    public returnsMany: boolean = true;

    constructor(primaryModel: BaseModel, foreignFunc: new (...args: any[]) => BaseModel, linkTable: string, primaryForeignKey: string, secondaryForeignKey: string) {
        this.primaryModel = primaryModel;
        this.foreignModel = new foreignFunc();
        this.linkTable = linkTable;
        this.primaryForeignKey = primaryForeignKey;
        this.secondaryForeignKey = secondaryForeignKey;
        this.query = this.generateQuery();
    }

    public setLinkColumns(cols:string[]) {
        this.linkColumns = cols;
        cols.forEach((col)=>{
            this.query.addCol(col);
        });
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

        daQuery.join(this.linkTable,(query)=>{
            query.on("__primary__." + self.primaryModel.getPrimaryKey(),"="," " + self.linkTable + "." + self.primaryForeignKey);
            return query;
        });

        daQuery.join(this.foreignModel.getTable(), (query: QueryConstraints)=>{
            query.on(self.linkTable + "." + self.secondaryForeignKey, "=", self.foreignModel.getTable() + "." + self.foreignModel.getPrimaryKey());
            return query;
        });
        return daQuery
    }

    private async getFilteredResult(ids:any[]) {
        let daQuery = this.query;
        daQuery.whereIn("__primary__." + this.primaryModel.getPrimaryKey(),ids, true);
        let results = await daQuery.fetch();
        let groupedResults:{[key:string]:BaseModel} = {};
        let modelConstructor: any = this.foreignModel.constructor;
        results.rows.forEach(result=>{
            if(!(result["__table_" + this.primaryModel.getTable() + "__key"] in groupedResults)) {
                var resModel: BaseModel = new modelConstructor();
                if(!resModel.getSqlConfig()) {
                    resModel.setSqlConfig(this.primaryModel.getSqlConfig());
                }
                resModel.loadData(result);                            
                if(this.linkColumns && this.linkColumns.length > 0) {
                    this.linkColumns.forEach((col)=>{
                        if(col in result) {
                            resModel.setAdditionalColumn(col, result[col]);
                        }
                    });
                }
                resModel.setVisibleColumns(Object.keys(result));
                groupedResults[result["__table_" + this.primaryModel.getTable() + "__key"]] = resModel;
            }
        });
        return results;
    }
    private async getUnFilteredResult() {
        let daQuery = this.query;
        daQuery.where("__primary__." + this.primaryModel.getPrimaryKey(),"=",this.primaryModel.getColumn(this.primaryModel.getPrimaryKey()), true);
        let results = await daQuery.fetchModels()
        let model = results.first();
        return model;
    }

    public getResult(ids: any[]): Promise<SQLResult>
    public getResult(): Promise<BaseModel>
    public getResult(ids: any = null): Promise<any> {
        return new Promise(async (resolve,reject)=>{
            if(ids !== null) {
                resolve(await this.getFilteredResult(ids));
            } else {
                resolve(await this.getUnFilteredResult());
            }            
            
        });            
    }

    private async getUnfilteredResults() {
        let daQuery = this.query;
        daQuery.where("__primary__." + this.primaryModel.getPrimaryKey(),"=",this.primaryModel.getColumn(this.primaryModel.getPrimaryKey()), true);
        let results = await daQuery.fetchModels();
        return results;        
    }
    
    private async getFilteredResults(ids:any[]) {
        let daQuery = this.query;
        daQuery.whereIn("__primary__." + this.primaryModel.getPrimaryKey(),ids, true);
        let results = await daQuery.fetch();
        let groupedResults:{[key:string]:ModelCollection} = {};
        let modelConstructor: any = this.foreignModel.constructor;
        results.rows.forEach(result=>{
            if(!(result["__table_" + this.primaryModel.getTable() + "__key"] in groupedResults)) {
                groupedResults[result["__table_" + this.primaryModel.getTable() + "__key"]] = new ModelCollection;
            }
            var resModel: BaseModel = new modelConstructor();
            if(!resModel.getSqlConfig()) {
                resModel.setSqlConfig(this.primaryModel.getSqlConfig());
            }
            resModel.loadData(result);
            if(this.linkColumns && this.linkColumns.length > 0) {
                this.linkColumns.forEach((col)=>{
                    if(col in result) {
                        resModel.setAdditionalColumn(col, result[col]);
                    }
                });
            }                        
            resModel.setVisibleColumns(Object.keys(result));
            groupedResults[result["__table_" + this.primaryModel.getTable() + "__key"]].add(resModel);
        });
        return groupedResults;
    }

    public getResults(ids: any[]): Promise<{[key:string]:ModelCollection}>
    public getResults(): Promise<ModelCollection>
    public getResults(ids: any = null): Promise<any> {
        return new Promise(async (resolve,reject)=>{
            if(ids !== null) {
                resolve(await this.getFilteredResults(ids));
            } else {
                resolve(await this.getUnfilteredResults());
            }            
            
        });            
    }

    public async link(id:any) {
        var daQuery = new ModelDB(this.primaryModel.getSqlConfig());
        if(!daQuery){
            throw("No database found");
        }
        daQuery.table(this.linkTable);
        var insert:{[key:string]:any} = {};
        insert[this.primaryForeignKey] = this.primaryModel.getColumn(this.primaryModel.getPrimaryKey());
        insert[this.secondaryForeignKey] = id;
        daQuery.insert(insert,true);
        const result = await daQuery.save().catch(e=>{
            throw e;
        })
        
        return result.rows_affected > 0;
    }

    public async unlink(id:boolean) {
        var daQuery = new ModelDB(this.primaryModel.getSqlConfig());
        if(!daQuery) {
            throw("No database found");
        }
        daQuery.table(this.linkTable);
        daQuery.where(this.primaryForeignKey,"=",this.primaryModel.getColumn(this.primaryModel.getPrimaryKey()),true);
        daQuery.where(this.secondaryForeignKey,"=",id,true);
        const result = await daQuery.delete().catch(e=>{
            throw e;
        })
        return result.rows_affected > 0;
    }
    
    public async update(id:any,updateValues:{[key:string]:any}) {
        var daQuery = new ModelDB(this.primaryModel.getSqlConfig());
        if(!daQuery) {
            throw("No database found");
        }
        daQuery.table(this.linkTable);
        daQuery.where(this.primaryForeignKey,"=",this.primaryModel.getColumn(this.primaryModel.getPrimaryKey()),true);
        daQuery.where(this.secondaryForeignKey,"=",id,true);
        var newUpdate:{[key:string]:any} = {};
        for(var key in updateValues) {
            if(this.linkColumns && this.linkColumns.indexOf(key) > -1) {
                newUpdate[key] = updateValues[key];
            }
        }
        if(Object.keys(newUpdate).length > 0) {
            daQuery.update(newUpdate,true);
            const result = await daQuery.save().catch(e=>{
                throw e;
            })
            return result.rows_affected > 0;
        }
        return false;
    }



}
