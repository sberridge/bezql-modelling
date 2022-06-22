import ModelDB from './ModelDB';
import BaseModel from './BaseModel'
import IRelation from './relations/IRelation';
export default class ModelCollection {
    private models: BaseModel[] = [];
    private index = 0;
    private modelIdHash: Map<string|number, BaseModel[]> = new Map;

    public add(model:BaseModel) {
        this.models.push(model);
        const modelId = model.getColumn(model.getPrimaryKey());
        let modelMapArr = this.modelIdHash.get(modelId) 
        if(!modelMapArr) {
            modelMapArr = [];
            this.modelIdHash.set(modelId, modelMapArr);
        }
        modelMapArr.push(model);
    }

    public getModels(): BaseModel[] {
        return this.models;
    }

    public find(id:string|number) {
        return this.modelIdHash.get(id);
    }

    public first(): BaseModel | null {
        if(this.models.length > 0) {
            return this.models[0];
        }
        return null;
    }

    public toList(): {[key:string]:any}[] {
        var returnArr: {[key:string]:any}[] = [];
        this.models.forEach(element => {
            returnArr.push(element.getData())
        });
        return returnArr;
    }

    public toJSON() : {[key:string]:any}[] {
        var returnArr: {[key:string]:any}[] = [];
        this.models.forEach(element => {
            returnArr.push(element.toJSON())
        });
        return returnArr;
    }

    public getIDs(): (string|number)[] {
        
        return Object.keys(this.modelIdHash);
    }

    public save():Promise<void> {
        return new Promise((resolve,reject)=>{
            var saved = 0;
            this.models.forEach((model)=>{
                model.save().then((res)=>{
                    saved++;
                    if(saved == this.models.length) {
                        resolve();
                    }
                });
            })
        });
            
    }

    public setVisibleColumns(columns: string[]) {
        this.models.forEach((model)=>{
            model.setVisibleColumns(columns);
        });
    }

    private getRelationName(relationKey:string):[string[], string|undefined] {
        const relationNames = relationKey.split(".");
        const relationName = relationNames.shift();
        return [relationNames, relationName];
    }

    private getIdsToLoadAndNextLoadCollection(relationName:string):[(string | number)[], ModelCollection] {
        const idsToLoad: (string | number)[] = [];
        const nextLoadModelCollection = new ModelCollection();

        this.models.forEach(model=>{
            if(!model.hasRelation(relationName)) {
                idsToLoad.push(model.getColumn(model.getPrimaryKey())); 
            } else {
                const existingRelation = model.getRelation(relationName);
                if(existingRelation instanceof ModelCollection) {
                    existingRelation.getModels().forEach((model)=>{
                        nextLoadModelCollection.add(model);
                    });
                } else if(existingRelation !== null) {
                    nextLoadModelCollection.add(existingRelation);
                }
            }
        });

        return [idsToLoad, nextLoadModelCollection];
    }

    private setEagerLoadedRelations(results:{[key:string]:ModelCollection}, relationName:string, useCollection:boolean) {
        const nextModelCollection = new ModelCollection();
        for(const modelID in results) {
            const relatedModels = results[modelID as keyof typeof results];
            const firstModel = this.first();
            let actualID: string | number = modelID;
            if(firstModel && typeof firstModel.getColumn(firstModel.getPrimaryKey()) === "number") {
                actualID = parseInt(actualID);
            }
            if(useCollection) { 
                this.modelIdHash.get(actualID)?.forEach(model=>{
                    model.setRelation(relationName,relatedModels);
                });
            } else {
                const relatedModel = relatedModels.first();
                this.modelIdHash.get(actualID)?.forEach(model=>{
                    model.setRelation(relationName,relatedModel);
                });                                          
            }
            relatedModels.getModels().forEach(model=>{
                nextModelCollection.add(model);
            });
        }
        return nextModelCollection;
    }
    private async loadEagerLoadedRelation(relationName:string, relation:IRelation, idsToLoad:(string | number)[]) {
        
        const results = await relation.getResults(idsToLoad);
        const noResults = Array.from(this.modelIdHash.keys()).filter((value)=>{
            return !(value in results);
        });
        noResults.forEach((id)=>{
            this.modelIdHash.get(id)?.forEach(model=>{
                if(relation.returnsMany) {
                    model.setRelation(relationName, new ModelCollection);
                } else {
                    model.setRelation(relationName, null);
                }                
            });
        });

        const nextModelCollection = this.setEagerLoadedRelations(results, relationName, relation.returnsMany)
        
        return nextModelCollection;
    }

    private eagerLoadLevel(relationKey:string,func: ((q:ModelDB)=>ModelDB) | null):Promise<void> {
        const model = this.first();
        
        return new Promise(async (resolve,reject)=>{
            if(!model) return resolve();
            
            const [relationNames, relationName] = this.getRelationName(relationKey);

            if(!relationName) return reject();
            if(!(relationName in model)) return reject();

            const relationFunc = model[(relationName as keyof typeof model)] as ()=>IRelation;
            
            const relation:IRelation = relationFunc.call(model);

            if(relationNames.length == 0 && func !== null) {
                func(relation.getQuery(false));
            }

            const [idsToLoad, nextLoadModelCollection] = this.getIdsToLoadAndNextLoadCollection(relationName);

            if(idsToLoad.length > 0) {
                const newModels = await this.loadEagerLoadedRelation(relationName, relation, idsToLoad);
                
                for(const model of newModels) {
                    nextLoadModelCollection.add(model);
                }

                if(relationNames.length > 0) {
                    const nextLoad = new Map([
                        [relationNames.join("."), func]
                    ]);
                    nextLoadModelCollection.eagerLoad(nextLoad).then(()=>{
                        resolve()
                    });
                } else {
                    resolve();
                }
            } else {
                if(relationNames.length > 0) {
                    const nextLoad = new Map([
                        [relationNames.join("."), func]
                    ]);
                    nextLoadModelCollection.eagerLoad(nextLoad).then(()=>{
                        resolve()
                    });
                } else {
                    resolve();
                }
            }
            
        });
        
    }

    public eagerLoad(relations:Map<string, ((q: ModelDB)=>ModelDB) | null>):Promise<void> {
        return new Promise((resolve,reject)=>{
            if(this.models.length == 0) {
                resolve();
                return;
            } 
            var self = this;
            let relationKeys:string[] = [];
            for(let key of relations.keys()) {
                relationKeys.push(key);
            }
            function load() {
                if(relationKeys.length == 0) {
                    resolve();
                    return;
                }

                var key = relationKeys.shift();
                
                if(key) {
                    const relation = relations.get(key);
                    if(typeof relation !== "undefined") {
                        self.eagerLoadLevel(key,relation).then(load);
                    }
                }
            }
            load();
        });
        
    }
    

    [Symbol.iterator]() {
        return {
            next: ():IteratorResult<BaseModel> => {
                if(this.index < this.models.length) {
                    return {
                        value: this.models[this.index++],
                        done: false
                    };
                } else {
                    this.index = 0;
                    return {
                        done: true,
                        value: null
                    };
                }
            }
        };
    }

}