
import BelongsTo from './relations/BelongsTo';
import BelongsToMany from './relations/BelongsToMany';
import HasOne from './relations/HasOne';
import HasMany from './relations/HasMany';
import ModelCollection from './ModelCollection';
import ModelDB from './ModelDB';
import mSQL from './../interfaces/mSQL';

export default class BaseModel {
    private tableName: string;
    private sqlConfig: string;
    private primaryKey: string;
    private columns: string[] = ["*"];
    private original: {[key:string]:any} = {};
    private changed: {[key:string]:any} = {};
    private isNew: boolean;
    private relations: {[key:string]:ModelCollection | BaseModel | null} = {};
    private additionalColumns: {[key:string]:any} = {};
    private visibleColumns: string[] = [];
    private incrementingField: string | undefined;

    constructor(sqlConfig: string, tableName: string, primaryKey: string = "id", fields: string[]) {
        this.relations = {};
        this.sqlConfig = sqlConfig;
        this.tableName = tableName;
        this.primaryKey = primaryKey;
        this.columns = [];
        this.isNew = true;
        fields.forEach((field)=> {
            this.original[field] = null;
            this.columns.push(this.tableName + "." + field);
        });
    }

    protected setIncrementingField(field:string) {
        if(Object.keys(this.original).includes(field)) {
            this.incrementingField = field;
        } else {
            throw 'incrementing field not found';
        }
    }

    public getSqlConfig() {
        return this.sqlConfig;
    }

    public setSqlConfig(config:string) {
        this.sqlConfig = config;
    }

    public getTable() : string {
        return this.tableName;
    }
    
    public getPrimaryKey() : string {
        return this.primaryKey;
    }

    private createDA() {
        const da = new ModelDB(this.sqlConfig);
        if(!da) {
            throw("No database found");
        }
        da.table(this.tableName);
        da.cols(this.columns);
        da.toModel(this.constructor as new (...args: any[]) => BaseModel);
        if(this.incrementingField) {
            da.setIncrementingField(this.incrementingField);
        }
        return da;
    }

    private toBaseModel():BaseModel {
        return this;
    }

    public async find<TModel extends BaseModel>(id: any) : Promise<TModel | null> {
        const da = this.createDA();
        da.where(this.primaryKey,"=",id,true);
        const result = await da.fetch().catch(e=>{
            throw e;
        });
        if(result.rows.length > 0) {
            this.original = result.rows[0];
            this.isNew = false;
            const model = this.toBaseModel();
            return model as TModel;
        } else {
            return null;
        }             
    }

    public loadData(data: object) {
        for(var key in data) {
            if(Object.keys(this.original).indexOf(key) > -1) {
                this.original[key] = data[key as keyof typeof data];
            }
        }
        this.isNew = false;
        return this;
    }

    public all():mSQL {
        const da = this.createDA() as mSQL;
        return da;
    }

    public setSelectColumns(columns: string[]): any {
        if(columns.indexOf(this.primaryKey) == -1) {
            columns.push(this.primaryKey);
        }
        var selectColumns: string[] = [];
        columns.forEach((col)=>{
            if(Object.keys(this.original).indexOf(col) > -1) {
                selectColumns.push(this.tableName + "." + col);
            }
        });
        this.columns = selectColumns;
        return this;
    }

    public getSelectColumns(): string[] {
        return this.columns;
    }

    public setColumn(column: string, value: any) {
        if(column in this.original) {
            this.changed[column] = value;
        }
    }
    
    public setColumns(values: {[key:string]:any}) {
        for(var key in values) {
            this.setColumn(key,values[key]);
        }
    }

    public getData() : {[key:string]:any} {
        var values:{[key:string]:any} = {};
        for(var key in this.original) {
            if(key in this.changed) {
                values[key] = this.changed[key];
            } else {
                values[key] = this.original[key];
            }
        }
        return values;
    }

    public getColumn(column: string) {
        if(column in this.changed) {
            return this.changed[column];
        } else if(column in this.original) {
            return this.original[column];
        }
        return null;
    }
    
    public setAdditionalColumn(field:string,value:any) {
        this.additionalColumns[field] = value;
    }

    public getAdditionalColumns() : object {
        return this.additionalColumns;
    }

    public getAdditionalColumn(column: string) {
        if(column in this.additionalColumns) {
            return this.additionalColumns[column];
        }
        return null;
    }

    public toJSON() {
        var base = this.getData();
        for(let key in this.additionalColumns) {
            base[key] = this.additionalColumns[key];
        }
        if(this.visibleColumns.length > 0) {
            for(var key in base) {
                if(this.visibleColumns.indexOf(key) === -1) {
                    delete base[key];
                }
            }
        }
        for(var key in this.relations) {
            const relation = this.relations[key];
            if(relation instanceof ModelCollection) {
                base[key] = [];
                relation.getModels().forEach((related)=>{
                    base[key].push(related.toJSON());
                });
            } else if(relation) {
                base[key] = relation.toJSON();
            }
        }
        return base;
    }

    public setVisibleColumns(columns: string[]) : any {
        this.visibleColumns = [];
        var allFields = Object.keys(this.original).concat(Object.keys(this.additionalColumns));
        columns.forEach(col=>{
            if(allFields.indexOf(col) > -1) {
                this.visibleColumns.push(col);
            }       
        });
        return this;
    }

    public async save(): Promise<boolean> {
        const da = this.createDA();
        var updateObj:{[key:string]:any} = {};
        for(var key in this.changed) {
            updateObj[key] = this.changed[key];
        }
        if(!this.isNew) {
            da.update(updateObj,true);
            da.where(this.primaryKey,"=",this.original[this.primaryKey],true);
        } else {
            da.insert(updateObj,true);
        }
        const result = await da.save().catch(e=>{
            throw e;
        });
        
        if(result.rows_affected > 0) {
            if(this.isNew) {
                if(result.insert_id > 0) {
                    this.original[this.primaryKey] = result.insert_id;
                }
                this.isNew = false;
            }
            for(var key in this.changed) {
                this.original[key] = this.changed[key];
            }
        }                
        return result.rows_affected > 0;
    }

    public async delete(): Promise<boolean> {
        if(this.isNew) {
            throw "attempting to delete a new model";
        }
        const da = this.createDA();
        da.where(this.primaryKey,"=",this.original[this.primaryKey],true);
        const result = await da.delete().catch(e=>{
            throw e;
        });
        return result.rows_affected > 0;
    }

    public belongsTo<TModel extends BaseModel = BaseModel>(modelFunc: new (...args: any[]) => TModel, foreignKey: string) {
        return new BelongsTo<TModel>(this,modelFunc,foreignKey);
    }
    
    public hasOne<TModel extends BaseModel = BaseModel>(modelFunc: new (...args: any[]) => TModel, foreignKey: string) {
        return new HasOne<TModel>(this,modelFunc,foreignKey);
    }
    
    public hasMany<TModel extends BaseModel = BaseModel>(modelFunc: new (...args: any[]) => TModel, foreignKey: string) {
        return new HasMany<TModel>(this,modelFunc,foreignKey);
    }
    
    public belongsToMany<TModel extends BaseModel = BaseModel>(modelFunc: new (...args: any[]) => TModel, linkTable: string, primaryForeignKey: string, secondaryForeignKey: string) {
        return new BelongsToMany<TModel>(this,modelFunc,linkTable,primaryForeignKey,secondaryForeignKey);
    }

    public setRelation(relationName: string, models: ModelCollection | BaseModel | null) {
        if(typeof this[relationName as keyof this] !== "undefined") {
            this.relations[relationName] = models;
        }
    }
    public getRelation<TModel extends BaseModel = BaseModel>(relationName: string) {
        if(relationName in this.relations) {
            const relation = this.relations[relationName];
            if (relation instanceof BaseModel) {
                return relation as TModel;
            } else if (relation instanceof ModelCollection) {
                return relation as ModelCollection<TModel>;
            }
            return null;
        }
        return null;
    }
    public hasRelation(relationName:string): boolean {
        return relationName in this.relations;
    }

    

    public eagerLoad(relations:Map<string, ((q: ModelDB)=>ModelDB) | null>) {
        var collection = new ModelCollection;
        collection.add(this);
        return collection.eagerLoad(relations);
        
    }
}