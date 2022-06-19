# BeZQL Modelling

Package built on top of the core BeZQL library which provides data modelling functionality.

## Installation

```
npm install bezql-modelling
```

## Adding Database Connections

Add a connection using the addConfig function, this serves as an abstraction of the underlying bezql addConfig function.

```typescript
import * as bezql_modelling from "bezql-modelling";

bezql_modelling.addConfig("test", {
    "type": "MySQL",
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "test"
});
```

### Supported Databases

This package currently supports MySQL and Postgres connections.

## Remove Database Connection

Use removeConfig to remove a connection and close any open connection pools.

```typescript
bezql_modelling.removeConfig("test");
```

## Create a Model Definition

Models are classes which extend from the bezql_modelling BaseModel class.

```typescript
import BaseModel from "bezql-modelling/classes/BaseModel";

class User extends BaseModel {

    static table = "user";

    static fields = {
        "id": "id",
        "name": "name",
        "active": "active"
    };

    constructor() {
        //pass through the connection to use, the table name, the primary key field, and a list of the table fields
        super("test", User.table, User.fields.id, Object.values(User.fields));
    }
}
```

## CRUD Operations

### Selecting

There are two ways of selecting records using the model, the first is using the "find" method to return a record by it's unique ID.

```typescript
const user = await (new User()).find(1).catch(error=>{
    //log error
});

if(!user) {
    //record not found
}

const fieldValues = user.getColumns();
{
    "id": 1,
    "name": "Jimmy",
    "active": 1
}
```

The second is to use the "all" method to query and return a collection containing multiple records.

```typescript
const users: ModelCollection = await (new User()).all()
    .where("active", "=", 1, true)
    .fetchModels()
    .catch(error=>{
        //log error
    });

for(const user of users) {
    const fieldValues = user.getColumns();
}
```

The same query constraint methods are available here that are also available in the core [BeZQL library](https://www.npmjs.com/package/bezql#user-content-conditions).

#### Streaming

For larger data sets you can stream the results using streamModels; this will return a set of models at a time.

```typescript
await (new User()).all()
    .streamModels(10, await (models:ModelCollection) => {

        //handle model set

        //return true to get next set, or false to cancel the stream early
        return true;
    })
```

### Inserting

New records can be created by simply creating a new instance of the model class, set the field values, and then call save.

```typescript
const user = new User();

//set multiple fields
user.updateColumns({
    "name": "Jim",
    "active": 1
});

//set individual field
user.updateColumn("name", "jim");

const saved = await user.save();
if(saved) {
    const newRecordId = user.getColumn("id");
}
```

### Updating

Updating is done by first fetching a record, modifying the field values, then using save.

```typescript
const user = (new User()).find(1).catch(error=>{
    //log error
});

user.updateColumns({
    "name": "James"
});

const saved = await user.save();
```

### Deleting

Much like updating records, deleting involves first fetching a record and then calling delete.

```typescript
const user = (new User()).find(1).catch(error=>{
    //log error
});

const deleted = await user.delete();
```

## Relationship Mapping

You can define relationships between different models in their respective classes to link records together

There are 4 relation types available:

* BelongsTo (Many to One)
* HasOne (One to One)
* HasMany (One to Many)
* BelongsToMany (Many to Many)

#### BelongsTo

BelongsTo defines a "Many to One" relationship, wherein this model belongs to a record which could own one or more records from this models table.

*api/models/User.ts*
```typescript
export class User extends BaseModel {
    constructor() { 
        super("test", User.table, User.fields.id, Object.values(User.fields));
    }

    static table = "users";

    static fields = {
        "id": "id",
        "name": "name",
        "user_group_id": "user_group_id"
    }

    public userGroup() {
        return this.belongsTo(UserGroup, User.fields.user_group_id);
    }

}
```

##### Use Relationship

```typescript
const user = await (new User()).find(1).catch(error=>{
    //log error
}) as User | null;

if(!user) return;

const userGroup = await user.userGroup().getResult();

const groupName = userGroup.getColumn(UserGroup.fields.name);
```

#### HasOne

HasOne defines a "One to One" relationship, wherein this model owns a single record from another table.

```typescript
export class User extends BaseModel {
    constructor() { 
        super("test", User.table, User.fields.id, Object.values(User.fields));
    }

    static table = "users";

    static fields = {
        "id": "id",
        "name": "name"
    }

    public userSettings() {
        return this.hasOne(UserSettings, UserSettings.fields.user_id);
    }

}
```

##### Use Relationship

```typescript
const user = await (new User()).find(1).catch(error=>{
    //log error
}) as User | null;

if(!user) return;

const userSettings = await user.userSettings().getResult();

const theme = userGroup.getColumn(UserSettings.fields.theme_name);
```

#### HasMany

HasMany defines a "One to Many" relationship, wherein this model owns multiple records from another table.

This is essentially the opposite relationship to "BelongsTo"

```typescript
export class User extends BaseModel {
    constructor() { 
        super("test", User.table, User.fields.id, Object.values(User.fields));
    }

    static table = "users";

    static fields = {
        "id": "id",
        "name": "name"
    }

    public hobbies() {
        return this.hasMany(Hobby, Hobby.fields.user_id);
    }

}
```

##### Use Relationship

```typescript
const user = await (new User()).find(1).catch(error=>{
    //log error
}) as User | null;

if(!user) return;

const userHobbies:ModelCollection = await user.hobbies().getResults();

for(const hobby of userHobbies) {
    const hobbyName = hobby.getColumn("hobby");
}
```

#### BelongsToMany

BelongsToMany defines a "Many to Many" relationship, wherein this model owns multiple records from another table, and where the records in that table also own multiple records in *this* table.

BelongsToMany relationships are supported by a "link table" which joins records from one table with records from another.

*Table: users*
|field|type|
|-----|----|
|id|int|
|name|varchar|

*Table: events*
|field|type|
|-----|----|
|id|int|
|name|varchar|
|date|date|

*Table: user_event*
|field|type|
|-----|----|
|id|int|
|user_id|int|
|event_id|int|

Above we have three tables, a users table, an events table, and then a user_event table which links records from those tables together.

We can define this relationship in the User model like so:

```typescript
export class User extends BaseModel {
    constructor() { 
        super("test", User.table, User.fields.id, Object.values(User.fields));
    }

    static table = "users";

    static fields = {
        "id": "id",
        "name": "name"
    }

    public events() {
        return this.belongsToMany(Event, "user_event", "user_id", "event_id");
    }

}
```

##### Use Relationship

```typescript
const user = await (new User()).find(1).catch(error=>{
    //log error
}) as User | null;

if(!user) return;

const userEvents:ModelCollection = await user.events().getResults();

for(const event of userEvents) {
    const eventDate = event.getColumn("date");
}
```

##### Link Columns

Since BelongsToMany relationships involve a link table, it can often be the case where additional information is stored in the link table which will also need to be returned.

These fields from the link table can also be set in the relationship so that they are returned as "additional columns".

*api/models/User.ts*
```typescript
public events() {
    let relationship = this.belongsToMany(Event, "user_event", "user_id", "event_id");
    relationship.setLinkColumns(["paid"]);
    return relationship;
}
```

It will then be possible to access these fields from the results of the relationship.

```typescript
const user = await (new User()).find(1).catch(error=>{
    //log error
}) as User | null;

if(!user) return;

const userEvents:ModelCollection = await user.events().getResults();

for(const event of userEvents) {
    const paid:number = event.getAdditionalColumn("paid");
}
```

#### Manipulating Relationships

By default, by using a relationship you are going to return all of the related records.

You can change this by either adding constraints to the relationship within the model, or by adding constraints as you are using the relationship.

##### Add Constraints within Model

```typescript
public hobbies() {
    let relationship = this.hasMany(Hobby, Hobby.fields.user_id);

    //remove unneeded columns from the query and only return favourited hobbies
    relationship.getQuery()
        .removeCols([
            `${Hobby.table}.${Hobby.description}`
        ])
        .where("favourite", "=", 1, true);

    return relationship;
}
```

##### Adding Constraints After

```typescript
let userHobbiesRelation:BelongsToMany = user.hobbies();

userHobbiesRelation.getQuery()
    .removeCols([
        `${Hobby.table}.${Hobby.description}`
    ])
    .where("favourite", "=", 1, true);

const userEvents:ModelCollection = await userHobbiesRelation.getResults();
```

#### EagerLoading Relations
EagerLoading is a technique which allows for the efficient preloading of related records, this is useful for two purposes:

* Loading data for multiple models without having to fetch relations individually
* Loading data to be returned in the response


```typescript
const users:ModelCollection = await (new Users).all().FetchModels().catch(error=>{
    //log error
});

await users.eagerLoad(new Map([
    ["hobbies", (query)=>{
        query.where("favourite", "=", 1, true);
        return query;
    }],
    ["hobbies.type", null],
    ["city.parties", (query)=>{
        query.where("parties.date", ">", "2022-01-01", true);
        return query;
    }]
])).catch(error=>{
    //log error
});

for(const user of users) {
    const hobbies = user.getRelation("hobbies");
    const hobbyType = hobbies.first().getRelation("type");
    const city = user.getRelation("city");
    const cityParties = city.getRelation("parties");
}

users.first().toJSON();
/**
 *          {
 *              "id": 1,
 *              "name": "Bob",
 *              "hobbies": [
 *                  {
 *                      "id": 1,
 *                      "hobby": "Origami",
 *                      "favourite": 1,
 *                      "type": {
 *                          "id": 1,
 *                          "type": "craft"
 *                      }
 *                  }
 *              ],
 *              "city": {
 *                  "id": 1,
 *                  "city": "Lisbon",
 *                  "parties": [
 *                      {
 *                          "id": 1,
 *                          "date": "2022-02-01"
 *                      }
 *                  ]
 *              }
 *          }
 */
```

You can also eagerload relationships on a single model.

```typescript
const user = await (new User()).find(1).catch(error=>{
    //log error
}) as User | null;

if(!user) return;

await user.eagerLoad(new Map([
    ["hobbies", null],
    ["city.parties": (query)=>{
        query.where("parties.date", ">", "2022-01-01", true);
        return query;
    }]
]));

res.json(ResponseGenerator.success(user.toJSON()));
```