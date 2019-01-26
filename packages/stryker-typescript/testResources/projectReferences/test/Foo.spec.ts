import { Foo } from '../src/Foo';
import { expect } from 'chai';

describe(Foo.name, () => {

  it('should add 2 numbers', () => {
    expect(new Foo().add(20, 22)).eq(42);
  });
});
