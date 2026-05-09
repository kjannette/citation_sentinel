1. General Types

Don't ever use the types Number, String, Boolean, Symbol, or Object These types refer to non-primitive boxed objects that are almost never used appropriately in JavaScript code.

/* WRONG */
function reverse(s: String): String;

Do use the types number, string, boolean, and symbol.

/* OK */
function reverse(s: string): string;

Instead of Object, use the non-primitive object type.

2. Use const and let

JavaScript first searches to see if a variable exists locally, then searches progressively in higher levels of scope until global variables. var is function scope, but, let and const are block scope. 

Using let and const where appropriate makes the intention of the declarations clearer. 

It will also help in identifying issues when a value is reassigned to a constant accidentally by throwing a compile time error. 

Use a linter that automates checking and fixing this so that changing let to const doesn't become a delay in code review.

3. Use === instead of ==

JavaScript utilizes two different kinds of equality operators: === | !== and == | !=. 

It is considered best practice to always use the former set when comparing. 

If two operands are of the same type and value, then === produces true and !== produces false. 

However, when working with == and !=, we'll run into issues when working with different types. In these cases, they'll try to coerce the values, unsuccessfully.

4. Use the fastest way to loop arrays

There are many ways to loop through array. The first way is a for loop.  Other ways include the for...of loop, the forEach method for arrays, map, filter, and others. There is also the while loop. 

The for loop is the fastest way. Caching the length makes the loop perform better. Some browser engines have optimized the for loop without manually caching the length property. The forEach is slower than the for loop, so it's probably better to avoid it, especially for large arrays. However, unless we are desperate for performance at the code level (which is rare), make it readable. For example, we can use the for loop in server-side applications and the array methods in client-side applications, because, in general, we don't have expensive operations on the client-side.

5. Prefer array methods

It is recommended to use a functional approach without intermediate variables. The base JavaScript for loop can be more performant in some browsers but the benefit can be measured only by iterating over millions of items. It is the job of compiler and runtime to remove the penalty of using new array methods. 

6. Do not trust any data - Validate

Make sure that all the data that goes into our system is clean and exactly what we need. This is most important on the back end when writing out parameters retrieved from the URL. 

The same applies to forms that validate only on the client side. Another very insecure practice is to read information from the DOM and use it without validation.

7. Generics

Don't ever have a generic type which doesn't use its type parameter.

8. Any

Don't use any as a type unless you are in the process of migrating a JavaScript project to TypeScript. The compiler effectively treats any as "please turn off type checking for this thing". It is similar to putting an @ts-ignore comment around every usage of the variable. This can be very helpful when you are first migrating a JavaScript project to TypeScript as you can set the type for stuff you haven't migrated yet as any, but in a full TypeScript project you are disabling type checking for any parts of your program that use it.
In cases where you don't know what type you want to accept, or when you want to accept anything because you will be blindly passing it through without interacting with it, you can use unknown.

9. Strict configuration

The stricter configuration is mandatory. Otherwise, types will be too permissive, and it is what we are trying to avoid as much as possible with Typescript.

{
  "forceConsistentCasingInFileNames": true,
  "noImplicitReturns": true,
  "strict": true,
  "noUnusedLocals": true,
}

The most important one here is the strict flag which actually covers four other flags: noImplicitAny, noImplicitThis, alwaysStrict and strictNullChecks.

10. Callback Types - Return Types of Callbacks

Don't use the return type any for callbacks whose value will be ignored:
/* WRONG */
function fn(x: () => any) {
 x();
}

Do use the return type void for callbacks whose value will be ignored:
/* OK */
function fn(x: () => void) {
 x();
}

Why: Using void is safer because it prevents you from accidentally using the return value of x in an unchecked way:
function fn(x: () => void) {
 const k = x(); // oops! meant to do something else
 k.doSomething(); // error, but would be OK if the return type had been 'any'
}

11. Optional Parameters in Callbacks

Don't use optional parameters in callbacks unless you really mean it:

/* WRONG */
interface Fetcher {
 getObject(done: (data: unknown, elapsedTime?: number) => void): void;
}

This has a very specific meaning: the done callback might be invoked with 1 argument or might be invoked with 2 arguments. The author probably intended to say that the callback might not care about the elapsedTime parameter, but there's no need to make the parameter optional to accomplish this — it's always legal to provide a callback that accepts fewer arguments.

Do write callback parameters as non-optional:
/* OK */
interface Fetcher {
 getObject(done: (data: unknown, elapsedTime: number) => void): void;
}

12. Overloads and Callbacks

Don't write separate overloads that differ only on callback arity:

/* WRONG */
declare function beforeAll(action: () => void, timeout?: number): void;
declare function beforeAll(
 action: (done: DoneFn) => void,
 timeout?: number
): void;

Do write a single overload using the maximum arity:

/* OK */
declare function beforeAll(
 action: (done: DoneFn) => void,
 timeout?: number
): void;

Why: It's always legal for a callback to disregard a parameter, so there's no need for the shorter overload. Providing a shorter callback first allows incorrectly-typed functions to be passed in because they match the first overload.

13. Function Overloads

13.1 Ordering

Don't put more general overloads before more specific overloads:
/* WRONG */
declare function fn(x: unknown): unknown;
declare function fn(x: HTMLElement): number;
declare function fn(x: HTMLDivElement): string;
const myElem: HTMLDivElement;
const x = fn(myElem); // x: unknown, wat?

Do sort overloads by putting the more general signatures after more specific signatures:

/* OK */
declare function fn(x: HTMLDivElement): string;
declare function fn(x: HTMLElement): number;
declare function fn(x: unknown): unknown;
const myElem: HTMLDivElement;
const x = fn(myElem); // x: string, :)

Why: TypeScript chooses the first matching overload when resolving function calls. When an earlier overload is "more general" than a later one, the later one is effectively hidden and cannot be called.

13.2 Use Optional Parameters

Don't write several overloads that differ only in trailing parameters:

/* WRONG */
interface Example {
 diff(one: string): number;
 diff(one: string, two: string): number;
 diff(one: string, two: string, three: boolean): number;
}

Do use optional parameters whenever possible:

/* OK */
interface Example {
 diff(one: string, two?: string, three?: boolean): number;
}

Note that this collapsing should only occur when all overloads have the same return type.

Why: This is important for two reasons.
TypeScript resolves signature compatibility by seeing if any signature of the target can be invoked with the arguments of the source, and extraneous arguments are allowed. This code, for example, exposes a bug only when the signature is correctly written using optional parameters:
function fn(x: (a: string, b: number, c: number) => void) {}
const example: Example;
// When written with overloads, OK -- used first overload
// When written with optionals, correctly an error
fn(example.diff);

The second reason is when a consumer uses the "strict null checking" feature of TypeScript. 

Because unspecified parameters appear as undefined in JavaScript, it's usually fine to pass an explicit undefined to a function with optional arguments. This code, for example, should be OK under strict nulls:
const example2: Example;
// When written with overloads, incorrectly an error because of passing 'undefined' to 'string'
// When written with optionals, correctly OK
example2.diff("something", true ? undefined : "hour");

13. Use Union Types

Don't write overloads that differ by type in only one argument position:
/* WRONG */
interface Moment {
 utcOffset(): number;
 utcOffset(b: number): Moment;
 utcOffset(b: string): Moment;
}

Do use union types whenever possible:
/* OK */
interface Moment {
 utcOffset(): number;
 utcOffset(b: number | string): Moment;
}
Note that we didn't make b optional here because the return types of the signatures differ.
❔ Why: This is important for people who are "passing through" a value to your function:
function fn(x: string): Moment;
function fn(x: number): Moment;
function fn(x: number | string) {
 // When written with separate overloads, incorrectly an error
 // When written with union types, correctly OK
 return moment().utcOffset(x);
}
