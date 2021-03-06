var env, store, Person, Name, Address, Hobby, people;

QUnit.module("integration - Dependent State", {
  setup: function() {
    Person = DS.Model.extend({
      title: DS.attr('string'),
      name: MF.fragment('name'),
      addresses: MF.fragmentArray('address'),
      titles: MF.array(),
      hobbies: MF.fragmentArray('hobby', { defaultValue: null })
    });

    Name = MF.Fragment.extend({
      first: DS.attr('string'),
      last: DS.attr('string'),
      person: MF.fragmentOwner()
    });

    Address = MF.Fragment.extend({
      street: DS.attr('string'),
      city: DS.attr('string'),
      region: DS.attr('string'),
      country: DS.attr('string')
    });

    Hobby = MF.Fragment.extend({
      name: DS.attr('string')
    });

    env = setupEnv({
      person: Person,
      name: Name,
      address: Address,
      hobby: Hobby
    });

    store = env.store;

    expectNoDeprecation();

    people = [
      {
        id: 1,
        name: {
          first: "Tyrion",
          last: "Lannister"
        },
        addresses: [
          {
            street: "1 Sky Cell",
            city: "Eyre",
            region: "Vale of Arryn",
            country: "Westeros"
          },
          {
            street: "1 Tower of the Hand",
            city: "King's Landing",
            region: "Crownlands",
            country: "Westeros"
          }
        ],
        titles: [
          "Hand of the King",
          "Master of Coin"
        ]
      }
    ];
  },

  teardown: function() {
    env = null;
    store = null;
    Person = null;
    Address = null;
    Name = null;
    Hobby = null;
    people = null;
  }
});

function pushPerson(id) {
  store.push({
    data: {
      type: 'person',
      id: id,
      attributes: Ember.A(people).findBy('id', id)
    }
  });
}

test("changing a fragment property dirties the fragment and owner record", function() {
  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {
        name: {
          first: "Jamie",
          last: "Lannister"
        }
      }
    }
  });

  return store.find('person', 1).then(function(person) {
    var name = person.get('name');

    name.set('first', 'Cercei');

    ok(name.get('hasDirtyAttributes'), "fragment is dirty");
    ok(person.get('hasDirtyAttributes'), "owner record is dirty");
  });
});

test("setting a fragment property to an object literal dirties the fragment and owner record", function() {
  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {
        name: {
          first: "Visenya",
          last: "Targaryen"
        }
      }
    }
  });

  return store.find('person', 1).then(function(person) {
    var name = person.get('name');

    person.set('name', {
      first: 'Rhaenys',
    });

    ok(name.get('hasDirtyAttributes'), "fragment is dirty");
    ok(person.get('hasDirtyAttributes'), "owner record is dirty");
  });
});

test("setting a fragment property with an object literal to the same value does not dirty the fragment or owner record", function() {
  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {
        name: {
          first: "Samwell",
          last: "Tarly"
        }
      }
    }
  });

  return store.find('person', 1).then(function(person) {
    var name = person.get('name');

    person.set('name', {
      first: "Samwell",
      last: "Tarly"
    });

    ok(!name.get('hasDirtyAttributes'), "fragment is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("restoring a fragment property to its original state returns the fragment and owner record to a clean state", function() {
  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {
        name: {
          first: "Hoster",
          last: "Tully"
        }
      }
    }
  });

  return store.find('person', 1).then(function(person) {
    var name = person.get('name');

    name.set('first', 'Brynden');
    name.set('first', 'Hoster');

    ok(!name.get('hasDirtyAttributes'), "fragment is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("restoring a fragment property to its original state when the owner record was dirty returns the fragment to a clean state maintains the owner record's dirty state", function() {
  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {
        name: {
          first: "Jorah",
          last: "Mormont"
        }
      }
    }
  });

  return store.find('person', 1).then(function(person) {
    var name = person.get('name');

    // Dirty the owner record
    person.set('title', 'Lord Commander');

    name.set('first', 'Jeor');
    name.set('first', 'Jorah');

    ok(!name.get('hasDirtyAttributes'), "fragment is clean");
    ok(person.get('hasDirtyAttributes'), "owner record is still dirty");
  });
});

test("rolling back the owner record returns fragment and owner record to a clean state", function() {
  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {
        name: {
          first: "Catelyn",
          last: "Stark"
        }
      }
    }
  });

  return store.find('person', 1).then(function(person) {
    var name = person.get('name');

    name.set('last', 'Tully');

    person.rollbackAttributes();

    ok(!name.get('hasDirtyAttributes'), "fragment is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("a record can be rolled back multiple times", function() {
  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {
        name: {
          first: "Arya",
          last: "Stark"
        }
      }
    }
  });

  return store.find('person', 1).then(function(person) {
    var name = person.get('name');

    name.set('last', '');
    person.rollbackAttributes();

    equal(name.get('last'), 'Stark', "fragment has correct values");
    ok(!name.get('hasDirtyAttributes'), "fragment is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");

    name.set('last', '');
    person.rollbackAttributes();

    equal(name.get('last'), 'Stark', "fragment has correct values");
    ok(!name.get('hasDirtyAttributes'), "fragment is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("rolling back a fragment returns the fragment and the owner record to a clean state", function() {
  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {
        name: {
          first: "Sansa",
          last: "Stark"
        }
      }
    }
  });

  return store.find('person', 1).then(function(person) {
    var name = person.get('name');

    // Dirty the fragment
    name.set('last', 'Lannister');

    name.rollbackAttributes();

    ok(!name.get('hasDirtyAttributes'), "fragment is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("changing a fragment property then rolling back the owner record preserves the fragment's owner", function() {
  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {
        name: {
          first: "Arya",
          last: "Stark"
        }
      }
    }
  });

  return store.find('person', 1).then(function(person) {
    var name = person.get('name');

    person.set('name', null);

    person.rollbackAttributes();

    equal(name.get('person'), person, "fragment owner is preserved");
  });
});

test("rolling back a fragment when the owner record is dirty returns the fragment to a clean state and maintains the owner record's dirty state", function() {
  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {
        name: {
          first: "Sansa",
          last: "Stark"
        }
      }
    }
  });

  return store.find('person', 1).then(function(person) {
    var name = person.get('name');

    // Dirty the owner record and fragment
    person.set('title', 'Heir to Winterfell');
    name.set('last', 'Lannister');

    name.rollbackAttributes();

    ok(!name.get('hasDirtyAttributes'), "fragment is clean");
    ok(person.get('hasDirtyAttributes'), "owner record is still dirty");
  });
});

test("a fragment property that is set to null can be rolled back", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var name = person.get('name');

    person.set('name', null);

    ok(person.get('hasDirtyAttributes'), "owner record is dirty");

    person.rollbackAttributes();

    deepEqual(person.get('name'), name, "property is restored");
    ok(!name.get('hasDirtyAttributes'), "fragment is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("a fragment property that is null can be rolled back", function() {
  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {}
    }
  });

  return store.find('person', 1).then(function(person) {
    var name = person.get('name');

    equal(name, null, "property is null");

    person.set('name', store.createFragment('name', { first: 'Rob', last: 'Stark' }));

    ok(person.get('hasDirtyAttributes'), "owner record is dirty");

    person.rollbackAttributes();

    equal(person.get('name'), null, "property is null again");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("changing a fragment array property with object literals dirties the fragment and owner record", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');

    person.set('addresses', [
      {
        street: "1 Sky Cell",
        city: "Eyre",
        region: "Vale of Arryn",
        country: "Westeros"
      },
      {
        street: "1 Dungeon Cell",
        city: "King's Landing",
        region: "Crownlands",
        country: "Westeros"
      }
    ]);

    ok(addresses.get('hasDirtyAttributes'), "fragment array is dirty");
    ok(person.get('hasDirtyAttributes'), "owner record is dirty");
  });
});

test("adding to a fragment array property with object literals dirties the fragment and owner record", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');

    addresses.pushObject({
      street: "1 Dungeon Cell",
      city: "King's Landing",
      region: "Crownlands",
      country: "Westeros"
    });

    ok(addresses.get('hasDirtyAttributes'), "fragment array is dirty");
    ok(person.get('hasDirtyAttributes'), "owner record is dirty");
  });
});

test("setting a fragment property with object literals to the same values does not dirty the fragment or owner record", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');

    person.set('addresses', people[0].addresses);

    ok(!addresses.get('hasDirtyAttributes'), "fragment is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("adding a fragment to a fragment array dirties the fragment array and owner record", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');

    addresses.createFragment('address', {
      street: "1 Dungeon Cell",
      city: "King's Landing",
      region: "Crownlands",
      country: "Westeros"
    });

    ok(addresses.get('hasDirtyAttributes'), "fragment array is dirty");
    ok(person.get('hasDirtyAttributes'), "owner record is dirty");
  });
});

test("removing a fragment from a fragment array dirties the fragment array and owner record", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');

    addresses.removeObject(addresses.get('firstObject'));

    ok(addresses.get('hasDirtyAttributes'), "fragment array is dirty");
    ok(person.get('hasDirtyAttributes'), "owner record is dirty");
  });
});

test("reordering a fragment array dirties the fragment array and owner record", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');
    var length = addresses.get('length');

    var address = addresses.popObject();
    addresses.unshiftObject(address);

    equal(addresses.get('length'), length, "fragment array length is maintained");
    ok(addresses.get('hasDirtyAttributes'), "fragment array is dirty");
    ok(person.get('hasDirtyAttributes'), "owner record is dirty");
  });
});

test("restoring a fragment array to its original order returns the fragment array owner record to a clean state", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');

    var address = addresses.popObject();
    addresses.pushObject(address);

    ok(!addresses.get('hasDirtyAttributes'), "fragment array is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("restoring a fragment array to its original order when the owner record was dirty returns the fragment array to a clean state and maintains the owner record's dirty state", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');

    // Dirty the owner record
    person.set('title', 'Hand of the King');

    var address = addresses.popObject();
    addresses.pushObject(address);

    ok(!addresses.get('hasDirtyAttributes'), "fragment array is clean");
    ok(person.get('hasDirtyAttributes'), "owner record is still dirty");
  });
});

test("changing a fragment property in a fragment array dirties the fragment, fragment array, and owner record", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');
    var address = addresses.get('firstObject');

    address.set('street', '2 Sky Cell');

    ok(address.get('hasDirtyAttributes'), "fragment is dirty");
    ok(addresses.get('hasDirtyAttributes'), "fragment array is dirty");
    ok(person.get('hasDirtyAttributes'), "owner record is dirty");
  });
});

test("restoring a fragment in a fragment array property to its original state returns the fragment, fragment array, and owner record to a clean state", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');
    var address = addresses.get('firstObject');

    address.set('street', '2 Sky Cell');
    address.set('street', '1 Sky Cell');

    ok(!address.get('hasDirtyAttributes'), "fragment is clean");
    ok(!addresses.get('hasDirtyAttributes'), "fragment array is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("restoring a fragment in a fragment array property to its original state when the fragment array was dirty returns the fragment to a clean state and maintains the fragment array and owner record's dirty state", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');
    var address = addresses.get('firstObject');

    // Dirty the record array
    addresses.popObject();

    address.set('street', '2 Sky Cell');
    address.set('street', '1 Sky Cell');

    ok(!address.get('hasDirtyAttributes'), "fragment is clean");
    ok(addresses.get('hasDirtyAttributes'), "fragment array is still dirty");
    ok(person.get('hasDirtyAttributes'), "owner record is dirty");
  });
});

test("restoring a fragment in a fragment array property to its original state when the owner record was dirty returns the fragment and fragment array to a clean state maintains the owner record's dirty state", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');
    var address = addresses.get('firstObject');

    address.set('street', '2 Sky Cell');
    address.set('street', '1 Sky Cell');

    // Dirty the owner record
    person.set('title', 'Master of Coin');

    ok(!address.get('hasDirtyAttributes'), "fragment is clean");
    ok(!addresses.get('hasDirtyAttributes'), "fragment array is clean");
    ok(person.get('hasDirtyAttributes'), "owner record is still dirty");
  });
});

test("rolling back the owner record returns all fragments in a fragment array property, the fragment array, and owner record to a clean state", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');
    var address = addresses.get('firstObject');

    // Dirty the owner record, fragment array, and a fragment
    person.set('title', 'Warden of the West');
    addresses.popObject();
    address.set('street', '2 Sky Cell');

    person.rollbackAttributes();

    ok(!address.get('hasDirtyAttributes'), "fragment is clean");
    ok(!addresses.get('hasDirtyAttributes'), "fragment array is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("rolling back the owner record returns all values in an array property, the array, and the owner record to a clean state", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var titles = person.get('titles');
    var values = titles.toArray();

    // Dirty the primitive array
    titles.popObject();
    titles.unshiftObject('Giant of Lannister');

    person.rollbackAttributes();

    deepEqual(values, person.get('titles').toArray(), "primitive values are reset");
    ok(!titles.get('hasDirtyAttributes'), "fragment array is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});


test("rolling back a fragment array returns all fragments, the fragment array, and the owner record to a clean state", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');
    var address = addresses.get('firstObject');

    // Dirty the fragment array and a fragment
    addresses.popObject();
    address.set('street', '2 Sky Cell');

    addresses.rollbackAttributes();

    ok(!address.get('hasDirtyAttributes'), "fragment is clean");
    ok(!addresses.get('hasDirtyAttributes'), "fragment array is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("rolling back a fragment array when the owner record is dirty returns all fragments and the fragment array to a clean state and retain's the owner record's dirty state", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');
    var address = addresses.get('firstObject');

    // Dirty the owner record, fragment array, and a fragment
    person.set('title', 'Lord of the Westerlands');
    addresses.popObject();
    address.set('street', '2 Sky Cell');

    addresses.rollbackAttributes();

    ok(!address.get('hasDirtyAttributes'), "fragment is clean");
    ok(!addresses.get('hasDirtyAttributes'), "fragment array is clean");
    ok(person.get('hasDirtyAttributes'), "owner record is still dirty");
  });
});

test("rolling back a fragment in a fragment array property returns the fragment, fragment array, and owner record to a clean states", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');
    var address = addresses.get('firstObject');

    // Dirty a fragment
    address.set('street', '2 Sky Cell');

    address.rollbackAttributes();

    ok(!address.get('hasDirtyAttributes'), "fragment is clean");
    ok(!addresses.get('hasDirtyAttributes'), "fragment array is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("rolling back a fragment in a fragment array property when the fragment array is dirty returns the fragment to a clean state and maintains the fragment array and owner record's dirty state", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');
    var address = addresses.get('firstObject');

    // Dirty fragment array, and a fragment
    addresses.popObject();
    address.set('street', '2 Sky Cell');

    address.rollbackAttributes();

    ok(!address.get('hasDirtyAttributes'), "fragment is clean");
    ok(addresses.get('hasDirtyAttributes'), "fragment array is still dirty");
    ok(person.get('hasDirtyAttributes'), "owner record is still dirty");
  });
});

test("rolling back a fragment in a fragment array property when the owner record is dirty returns the fragment and fragment array to a clean state and maintains the owner record's dirty state", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');
    var address = addresses.get('firstObject');

    // Dirty the owner record, and a fragment
    person.set('title', 'Lord of Casterly Rock');
    address.set('street', '2 Sky Cell');

    address.rollbackAttributes();

    ok(!address.get('hasDirtyAttributes'), "fragment is clean");
    ok(!addresses.get('hasDirtyAttributes'), "fragment array is clean");
    ok(person.get('hasDirtyAttributes'), "owner record is still dirty");
  });
});

test("a fragment array property that is set to null can be rolled back", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');

    person.set('addresses', null);

    ok(person.get('hasDirtyAttributes'), "owner record is dirty");

    person.rollbackAttributes();

    equal(person.get('addresses'), addresses, "property is restored");
    ok(!addresses.get('hasDirtyAttributes'), "fragment array is clean");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("a fragment array property that is null can be rolled back", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var hobbies = person.get('hobbies');

    equal(hobbies, null, "property is null");

    person.set('hobbies', [
      store.createFragment('hobby', {
        name: 'guitar'
      })
    ]);

    ok(person.get('hasDirtyAttributes'), "owner record is dirty");

    person.rollbackAttributes();

    equal(person.get('hobbies'), null, "property is null again");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("a fragment array property that is empty can be rolled back", function() {
  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {}
    }
  });

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');

    ok(Ember.isArray(addresses) && Ember.isEmpty(addresses), "property is an empty array");

    person.set('addresses', [
      store.createFragment('address', {
        street: "1 Spear Tower",
        city: "Sun Spear",
        region: "Dorne",
        country: "Westeros"
      })
    ]);

    ok(person.get('hasDirtyAttributes'), "owner record is dirty");

    person.rollbackAttributes();

    ok(Ember.isArray(person.get('addresses')) && Ember.isEmpty(person.get('addresses')), "property is an empty array again");
    ok(!person.get('hasDirtyAttributes'), "owner record is clean");
  });
});

test("pushing a fragment update doesn't cause it to become dirty", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    ok(!person.get('hasDirtyAttributes'), "person record is not dirty");

    store.push({
      data: {
        type: 'person',
        id: 1,
        attributes: {
          name: { first: "Jamie" }
        }
      }
    });

    equal(person.get('name.first'), "Jamie", "first name updated");
    equal(person.get('name.last'), "Lannister", "last name is the same");
    ok(!person.get('hasDirtyAttributes'), "person record is not dirty");
  });
});

test("pushing a fragment array update doesn't cause it to become dirty", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    ok(!person.get('hasDirtyAttributes'), "person record is not dirty");

    store.push({
      data: {
        type: 'person',
        id: 1,
        attributes: {
          addresses: [
            // Yeah, this is pretty weird...
            {},
            {
              street: "1 Dungeon Cell",
            }
          ]
        }
      }
    });

    equal(person.get('addresses.lastObject.street'), "1 Dungeon Cell", "street updated");
    equal(person.get('addresses.lastObject.city'), "King's Landing", "city is the same");
    ok(!person.get('hasDirtyAttributes'), "person record is not dirty");
  });
});
