# Export from Raml 1.0 to OAS 3.0

# Table of Contents
1. [Ojective](#objetive)
2. [General Process](#general_process)
3. [The root of the document](#root_document)
4. [RAML Data types](#data_types)
	1. [Type Declarations](#type_declarations)
	2. [Built-in types](#builtin_types)
		1. [Object Type](#object_type)
		2. [Array Type](#array_type)
		3. [Scalar Types](#scalar_type)
		4. [Union Type](#union_type)
		5. [Types defined using XML and JSON Schema](#xml_json_type)
		6. [User-defined Facets](#user_facets)
		7. [Type Expressions](#type_expressions)
		8. [Inline Type Declarations](#inline_declarations)
		9. [XML Serialization of Type Instances](#xml)
5. [Resources and Nested Resources](#resources)
6. [Methods](#methods)
	1. [Headers](#headers)
	2. [Query Strings and Query Parameters](#query_params)
	3. [Bodies](#bodies)
	4. [Responses](#responses)
7. [Security Schemes](#security_schemes)
8. [Examples](#examples)
	1. [Multiple Examples](#multi_examples)
	2. [Single Example](#single_example)
9. [Annotations](#annotations)
10. [Lost semantics between translations](#lost_semantics)
	1. [Traits and Resource types](#lost_sem_traits)
	2. [Libraries](#lost_sem_libraries)
	3. [Overlays and extensions](#lost_sem_overlays_extensions)
	4. [Others](#lost_sem_others)



<a name="objective"></a>
## Objective

This document covers the following aspects of the conversion from RAML 1.0 to OAS 3.0:

* how common concepts are being mapped
* how language specific concepts are being resolved
* lost semantics between languages

<a name="general_process"></a>
## General Process

Before converting a RAML document to OAS 3.0, the converter resolves the following semantics:

* traits
* resource types
* includes
* libraries

The outcome is a "service model" that will be used to build a single OAS 3.0 document following the mapping described in this document.

During the conversion, the tool is not expected to preserve all semantical data. See section "[The lost semantics between translations](#lost_semantics)".

<a name="root_document"></a>
## The root of the document

The root section of the RAML document describes the basic information about an API, such as its title and version. The root section also defines assets used elsewhere in the RAML document, such as types and traits.

<table>
  <tr>
    <td><b>RAML 1.0 Field Name</td>
    <td><b>OAS 3.0 Field Name</td>
  </tr>
  <tr>
    <td>title</td>
    <td>info.title</td>
  </tr>
  <tr>
    <td>description?</td>
    <td>info.description</td>
  </tr>
  <tr>
    <td>version?</td>
    <td>info.version</td>
  </tr>
  <tr>
    <td>baseUri?</td>
    <td>servers[].url</td>
  </tr>
  <tr>
    <td>baseUriParameters?</td>
    <td>servers[].variables</td>
  </tr>
  <tr>
    <td>protocols?</td>
    <td>schemes</td>
  </tr>
  <tr>
    <td>mediaType?</td>
    <td>consumes, produces</td>
  </tr>
  <tr>
    <td>documentation?</td>
    <td>No conversion to OAS.<a href="#lost_sem_others">Lost semantic.</a></td>
  </tr>
  <tr>
    <td>schemas?</td>
    <td>components.schemas<a href="#type_declarations">See Type Declarations mappings.</a></td>
  </tr>
  <tr>
    <td>types?</td>
    <td>components.schemas<a href="#type_declarations">See Type Declarations mappings.</a></td>
  </tr>
  <tr>
    <td>traits?</td>
    <td>No direct conversion to OAS.<br>This gap between specifications is being resolved as explained at Traits section.<br><a href="#lost_sem_traits">See Traits and Resource Types.</a></td>
  </tr>
  <tr>
    <td>resourceTypes?</td>
    <td>No direct conversion to OAS.<br>This gap between specifications is being resolved as explained at Resource Types section.<br><a href="#lost_sem_traits">See Traits and Resource Types.</a>
</td>
  </tr>
  <tr>
    <td>annotationTypes?</td>
    <td>No conversion to OAS.<a href="#lost_sem_others">Lost semantic.</a></td>
  </tr>
  <tr>
    <td>(annotationName)?</td>
    <td>x-annotation-annotationName vendor extension <br>
    <a href="#annotations">See Annotations mappings.</a>
    </td>
  </tr>
  <tr>
    <td>securitySchemes?</td>
    <td>securitySchemes</td>
  </tr>
  <tr>
    <td>securedBy?</td>
    <td>security</td>
  </tr>
  <tr>
    <td>uses?</td>
    <td>No conversion to OAS.<a href="#lost_sem_others">Lost semantic.</a></td>
  </tr>
  <tr>
    <td>/[relativeUri] ?</td>
    <td>Mapped to `paths`</td>
  </tr>
</table>

<a name="data_types"></a>
## RAML data types

Types are split into four families: external, object, array, and scalar.

Types can define two kinds of members: properties and facets. Both are inherited.

* Properties are regular, object oriented properties.

* Facets are special *configurations*. You specialize types based on characteristics of facet values. Examples: minLength, maxLength

Only object types can declare properties. All types can declare facets.

To specialize a scalar type, you implement facets, giving already defined facets a concrete value.

To specialize an object type, you define properties.

<a name="type_declarations"></a>
### Type Declarations

A type declaration references another type, or wraps or extends another type by adding functional facets (properties for example) or non-functional facets (a description for example), or is a type expression that uses other types.

Type declarations defined at root api file or external type declarations referenced through include or library / data type fragments are mapped to OAS 3.0 schemas with their schema objects.

<table>
  <tr>
    <td><b>RAML 1.0 Field Name</td>
    <td><b>OAS 3.0 Field Name</td>
  </tr>
  <tr>
    <td>default?</td>
    <td>default</td>
  </tr>
  <tr>
    <td>schema?</td>
    <td>inline declaration</td>
  </tr>
  <tr>
    <td>type?</td>
    <td>type</td>
  </tr>
  <tr>
    <td>example?</td>
    <td>example</td>
  </tr>
  <tr>
    <td>examples?</td>
    <td>No conversion to OAS. <a href="#lost_sem_others">Lost semantic.</a></td>
  </tr>
  <tr>
    <td>displayName?</td>
    <td>No conversion to OAS. <a href="#lost_sem_others">Lost semantic.</a></td>
  </tr>
  <tr>
    <td>description?</td>
    <td>description</td>
  </tr>
  <tr>
    <td>(annotationName)?</td>
    <td>x-annotation-annotationName vendor extension.
       <a href="#annotations">See Annotations mappings.</a>
    </td>
  </tr>
  <tr>
    <td>facets?</td>
    <td>No conversion to OAS.
        <a href="#user_facets">See User-defined Facets mappings.</a>
    </td>
  </tr>
  <tr>
    <td>xml?</td>
    <td>xml. <a href="#xml">See XML Serialization mappings.</a>
    </td>
  </tr>
  <tr>
    <td>enum?</td>
    <td>enum</td>
  </tr>
</table>

<table>
<tr>
  <td><b>RAML 1.0 example </td>
  <td><b>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 1

```yml
#%RAML 1.0
title: type example
version: 1
types:
  ResourceLink:
    description: a description
    facets:
      a: string
      b: number
    properties:
      href: string
      rel:
        enum: [self, next, prev]
      method?:
        default: get
  ImageLink:
    properties:
      href: string
      rel:
        enum: [SmallImage, MediumImage, LargeImage]
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: '1'
  title: type example
components:
  schemas:
    ResourceLink:
      properties:
        href:
          type: string
        rel:
          type: string
          enum:
            - self
            - next
            - prev
        method:
          type: string
          default: get
      type: object
      required:
        - href
        - rel
      description: a description
    ImageLink:
      properties:
        href:
          type: string
        rel:
          type: string
          enum:
            - SmallImage
            - MediumImage
            - LargeImage
      type: object
      required:
        - href
        - rel
paths: {}
```

  </td>
</tr>
<tr>
  <td>

Example 2

```yml
#%RAML 1.0
title: schema example
version: 1
schemas:
    song: |
        {
            "type": "object",
            "description": "main schema",
            "additionalProperties": true,
            "title": "a title",
            "properties": {
                "songTitle": {
                    "type": "string",
                    "required": true
                    },
                "albumId": {
                    "type": "string",
                    "required": true,
                    "minLength": 36,
                    "maxLength": 36
                }
            }
        }
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: '1'
  title: schema example
components:
  schemas:
    song:
      type: object
      description: main schema
      additionalProperties: true
      title: a title
      required:
        - songTitle
        - albumId
      properties:
        songTitle:
          type: string
        albumId:
          type: string
          minLength: 36
          maxLength: 36
paths: {}
```

  </td>
</tr>
<tr>
  <td>

Example 3

```yml
#%RAML 1.0
title: type example
version: 1
types:
  song:
    schema: |
        {
            "type": "object",
            "description": "main schema",
            "additionalProperties": true,
            "title": "a title",
            "properties": {
                "songTitle": {
                    "type": "string",
                    "required": true
                    },
                "albumId": {
                    "type": "string",
                    "required": true,
                    "minLength": 36,
                    "maxLength": 36
                }
            }
        }
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: '1'
  title: type example
components:
  schemas:
    song:
      type: object
      description: main schema
      additionalProperties: true
      title: a title
      required:
        - songTitle
        - albumId
      properties:
        songTitle:
          type: string
        albumId:
          type: string
          minLength: 36
          maxLength: 36
paths: {}
```

  </td>
</tr>
</table>

<a name="builtin_types"></a>
### Built-in types

<a name="object_type"></a>
#### Object Type

<table>
  <tr>
    <td><b>RAML 1.0 Field Name</td>
    <td><b>OAS 3.0 Field Name</td>
  </tr>
  <tr>
    <td>properties?</td>
    <td>properties</td>
  </tr>
  <tr>
    <td>minProperties?</td>
    <td>minProperties</td>
  </tr>
  <tr>
    <td>maxProperties?</td>
    <td>maxProperties</td>
  </tr>
  <tr>
    <td>additionalProperties?</td>
    <td>additionalProperties. </td>
  </tr>
  <tr>
    <td>discriminator?</td>
    <td>discriminator</td>
  </tr>
  <tr>
    <td>discriminatorValue?</td>
    <td>No conversion to OAS. <a href="#lost_sem_others">Lost semantic.</a></td>
  </tr>
</table>


<table>
<tr>
  <td><b>RAML 1.0 example </td>
  <td><b>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 4<br>
additionalProperties not allowed

```yml
#%RAML 1.0
title: example
version: 1
types:
  Address:
   additionalProperties: false
   type: object
   properties:
     street: string
     city: string
     name: string
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: '1'
  title: example
  description: ''
components:
  schemas:
    Address:
      type: object
      properties:
        street:
          type: string
        city:
          type: string
        name:
          type: string
      additionalProperties: false
      required:
        - street
        - city
        - name
paths: {}
```

  </td>
</tr>
<tr>
  <td>

Example 5<br>
additionalProperties allowed. no restrictions

```yml
#%RAML 1.0
title: example
version: 1
types:
  Address:
   type: object
   properties:
     street: string
     city: string
     name: string
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: '1'
  title: example
  description: ''
components:
  schemas:
    Address:
      type: object
      properties:
        street:
          type: string
        city:
          type: string
        name:
          type: string
      required:
        - street
        - city
        - name
paths: {}
```

  </td>
</tr>
<tr>
  <td>

Example 6<br>
additionalProperties allowed. Only string

```yml
#%RAML 1.0
title: example
version: 1
types:
  Address:
   type: object
   properties:
     street: string
     city: string
     //: string
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: "1.0"
  title: example
components:
  schemas:
    Address:
      properties:
        street:
          type: string
        city:
          type: string
      required:
        - street
        - city
      additionalProperties:
        type: string
paths: {}
```

  </td>
</tr>
<tr>
  <td>

Example 7<br>
additionalProperties allowed. <br>
Every property name has to follow a pattern. Value, string

```yml
#%RAML 1.0
title: example
version: 1
types:
  Address:
   type: object
   properties:
     street: string
     city: string
     /^note\d+$/: string
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: "1.0"
  title: example
components:
  schemas:
    Address:
      properties:
        street:
          type: string
        city:
          type: string
      required:
        - street
        - city
      additionalProperties:
        type: string
paths: {}
```

  </td>
</tr>
<tr>
  <td>

Example 8<br>
discriminator facet.

```yml
#%RAML 1.0
title: example
version: 1
types:
  Person:
   type: object
   discriminator: kind
      # refers to the `kind` property of object `Person`
   properties:
     kind: string
      # contains name of the kind of a `Person` instance
     name: string
  Employee:
     # kind may equal to `Employee; default value for `discriminatorValue`
   type: Person
   properties:
     employeeId: string
  User:
     # kind may equal to `User`; default value for `discriminatorValue`
   type: Person
   properties:
     userId: string
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: '1'
  title: example
components:
  schemas:
    Person:
      type: object
      discriminator:
        propertyName: kind
      properties:
        kind:
          type: string
        name:
          type: string
      required:
        - kind
        - name
    Employee:
      allOf:
        - $ref: '#/components/schemas/Person'
        - type: object
          properties:
            employeeId:
              type: string
          required:
            - employeeId
    User:
      allOf:
        - $ref: '#/components/schemas/Person'
        - type: object
          properties:
            userId:
              type: string
          required:
            - userId
paths: {}
```

  </td>
</tr>
</table>

<a name="array_type"></a>
#### Array Type

<table>
  <tr>
    <td><b>RAML 1.0 Field Name</td>
    <td><b>OAS 3.0 Field Name</td>
  </tr>
  <tr>
    <td>uniqueItems?</td>
    <td>uniqueItems</td>
  </tr>
  <tr>
    <td>items?</td>
    <td>items</td>
  </tr>
  <tr>
    <td>minItems?</td>
    <td>minItems</td>
  </tr>
  <tr>
    <td>maxItems?</td>
    <td>maxItems</td>
  </tr>
</table>


<table>
<tr>
  <td><b>RAML 1.0 example </td>
  <td><b>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 9

```yml
#%RAML 1.0
title: example
version: 1
types:
  Email: # normal object type declaration
    type: object
    properties:
      subject: string
      body: string
  EmailsLong: # array type declaration
    type: array
    items: Email
    minItems: 1
    uniqueItems: true
  EmailsShort:
     # array type declaration using type expression
     shortcut
    type: Email[] # '[]' expresses an array
    minItems: 1
    uniqueItems: true
    example: # example that contains array
      - # start item 1
        subject: My Email 1
        body: This is the text for email 1.
      - # start item 2
        subject: My Email 2
        body: This is the text for email 2.
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: '1'
  title: example
components:
  schemas:
    Email:
      properties:
        subject:
          type: string
        body:
          type: string
      type: object
      required:
        - subject
        - body
    EmailsLong:
      type: array
      uniqueItems: true
      items:
        $ref: '#/components/schemas/Email'
      minItems: 1
    EmailsShort:
      type: array
      example:
        - subject: My Email 1
          body: This is the text for email 1.
        - subject: My Email 2
          body: This is the text for email 2.
      uniqueItems: true
      minItems: 1
      items:
        $ref: '#/components/schemas/Email'
paths: {}
```

  </td>
</tr>
</table>

<a name="scalar_type"></a>
#### Scalar Types

**String**

String types are converted as strings. The following facets are available:

<table>
  <tr>
    <td><b>RAML 1.0 Field Name</td>
    <td><b>OAS 3.0 Field Name</td>
  </tr>
  <tr>
    <td>pattern?</td>
    <td>pattern</td>
  </tr>
  <tr>
    <td>minLength?</td>
    <td>minLength</td>
  </tr>
  <tr>
    <td>minLength?</td>
    <td>maxLength</td>
  </tr>
</table>


<table>
<tr>
  <td><b>RAML 1.0 example </td>
  <td><b>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 10

```yml
#%RAML 1.0
title: example
version: 1
types:
  Email:
    type: string
    minLength: 2
    maxLength: 6
    pattern: ^note\d+$
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: '1'
  title: example

components:
  schemas:
    Email:
      type: string
      minLength: 2
      maxLength: 6
      pattern: ^note\d+$
paths: {}
```

  </td>
</tr>
</table>


**Number / Integer**

Number types are converted to integer, long, float depending on type and format. The following facets are available:

<table>
  <tr>
    <td><b>RAML 1.0 Field Name</td>
    <td><b>AS 3.0 Field Name</td>
  </tr>
  <tr>
    <td>minimum?</td>
    <td>minimum</td>
  </tr>
  <tr>
    <td>maximum?</td>
    <td>maximum</td>
  </tr>
  <tr>
    <td>format?</td>
    <td>format</td>
  </tr>
  <tr>
    <td>multipleOf?</td>
    <td>multipleOf</td>
  </tr>
</table>


<table>
<tr>
  <td><b>RAML 1.0 example </td>
  <td><b>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 11

```yml
#%RAML 1.0
title: example
version: 1
types:
  Weight:
    type: number
    minimum: 3
    maximum: 5
    format: float
    multipleOf: 4
  Age:
    type: integer
    minimum: 3
    maximum: 5
    format: int8
    multipleOf: 1
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: '1'
  title: example
components:
  schemas:
    Weight:
      type: number
      minimum: 3
      maximum: 5
      format: float
      multipleOf: 4
    Age:
      type: integer
      minimum: 3
      maximum: 5
      format: int8
      multipleOf: 1
paths: {}
```

  </td>
</tr>
</table>


**Boolean**

A JSON boolean without any additional facets.

<table>
<tr>
  <td><b>RAML 1.0 example </td>
  <td><b>Converts to OAS 3.0 like this</td>
</tr>
<tr>
  <td>

Example 12

```yml
#%RAML 1.0
title: example
version: 1
types:
  isMarried:
    type: boolean
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: '1'
  title: example
components:
  schemas:
    isMarried:
      type: boolean
paths: {}
```

  </td>
</tr>
</table>


**Date**

<table>
<tr>
  <td><b>RAML 1.0 Field Name</td>
  <td><b>OAS 3.0 Field Name</td>
</tr>
<tr>
  <td>The "full-date" notation of RFC3339, namely yyyy-mm-dd.<br>type: date-only</td>
  <td>type: string<br>format: date</td>
</tr>
<tr>
  <td>The "partial-time" notation of RFC3339, namely hh:mm:ss[.ff...].<br>type: time-only</td>
  <td>type: string<br><a href="#lost_sem_others">Lost semantic.</a></td>
</tr>
<tr>
  <td>Combined date-only and time-only with a separator of "T", namely yyyy-mm-ddThh:mm:ss[.ff...]. type: datetime-only</td>
  <td>type: string <br><a href="#lost_sem_others">Lost semantic.</a></td>
</tr>
<tr>
  <td>A timestamp in one of the following formats:
    <ul>
      <li>if the format is omitted or set to rfc3339, uses the "date-time" notation of RFC3339;
      <li>if format is set to rfc2616, uses the format defined in RFC2616.
    </ul>
    type: datetime
  </td>
  <td>

```yml
if format = RFC3339
  type: string
  format: date-time
if not,
  type: string
```

  <a href="#lost_sem_others">Lost semantic.</a>
  </td>
</tr>
</table>

<table>
<tr>
  <td><b>RAML 1.0 example </td>
  <td><b>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 13

```yml
#%RAML 1.0
title: example
version: 1
types:
  birthday:
    type: date-only
      # no implications about time or offset
    example: 2015-05-23
  lunchtime:
    type: time-only
      # no implications about date or offset
    example: 12:30:00
  fireworks:
    type: datetime-only
      # no implications about offset
    example: 2015-07-04T21:00:00
  created:
    type: datetime
    example: 2016-02-28T16:41:41.090Z
    format: rfc3339
      # the default, so no need to specify
  If-Modified-Since:
    type: datetime
    example: Sun, 28 Feb 2016 16:41:41 GMT
    format: rfc2616
      # this time it's required, otherwise, the example format is invalid
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: example
components:
  schemas:
    birthday:
      type: string
      format: date
      example: 2015-05-23
    lunchtime:
      type: string
      example: 12:30:00
    fireworks:
      type: string
      example: 2015-07-04T21:00:00
    created:
      type: string
      example: 2016-02-28T16:41:41.090Z
      format: rfc3339
    If-Modified-Since:
      type: string
      example: Sun, 28 Feb 2016 16:41:41 GMT
paths: {}
```

  </td>
</tr>
</table>


**File**

The ​file​ type can constrain the content to send through forms. When this type is used in the context of web forms it SHOULD be represented as a valid file upload in JSON format. File content SHOULD be a base64-encoded string.

Models of file type are converted to OAS as strings. File specific facets are lost, although it is possible to keep minLength and maxLength since they are string facets as well.

<table>
  <tr>
    <td><b>RAML 1.0 Field Name</td>
    <td><b>OAS 3.0 Field Name</td>
  </tr>
  <tr>
    <td>fileTypes?</td>
    <td>No conversion to OAS. <a href="#lost_sem_others">Lost semantic.</a></td>
  </tr>
  <tr>
    <td>minLength?</td>
    <td>minLength</td>
  </tr>
  <tr>
    <td>maxLength?</td>
    <td>maxLength</td>
  </tr>
</table>


<table>
<tr>
  <td><b>RAML 1.0 example </td>
  <td><b>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 14

```yml
#%RAML 1.0
title: example
types:
  userPicture:
    type: file
    fileTypes: ['image/jpeg', 'image/png']
    maxLength: 307200
  customFile:
    type: file
    fileTypes: ['*/*'] # any file type allowed
    maxLength: 1048576
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: example
components:
  schemas:
    userPicture:
      type: string
      format: binary
      maxLength: 307200
    customFile:
      type: string
      format: binary
      maxLength: 1048576
paths: {}
```

  </td>
</tr>
</table>

<a name="union_type"></a>
#### Union Type

A union type is used to describe data by any of several types. A union type is declared via a type expression that combines 2 or more types delimited by pipe (|) symbols; these combined types are referred to as the union type's super types.

OAS allows combining and extending model schemas using the allOf property of JSON Schema, in effect offering model composition. Nevertheless, there are more complex union scenarios where allOf is not enough. When this is the case, union type is converted to an unrestricted object type. <a href="#lost_sem_others">Lost semantics.</a>

<table>
<tr>
  <td><b>RAML 1.0</td>
  <td><b>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 15<br>
Two types and a third type which is a union of those two types

```yml
#%RAML 1.0
title: My API With Types
types:
  Phone:
    type: object
    properties:
      manufacturer:
        type: string
      numberOfSIMCards:
        type: number
      kind: string
  Notebook:
    type: object
    properties:
      manufacturer:
        type: string
      numberOfUSBPorts:
        type: number
      kind: string
  Device:
    type: Phone | Notebook
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: My API With Types
components:
  schemas:
    Phone:
      properties:
        manufacturer:
          type: string
        numberOfSIMCards:
          type: number
        kind:
          type: string
      type: object
      required:
        - manufacturer
        - numberOfSIMCards
        - kind
    Notebook:
      properties:
        manufacturer:
          type: string
        numberOfUSBPorts:
          type: number
        kind:
          type: string
      type: object
      required:
        - manufacturer
        - numberOfUSBPorts
        - kind
    Device:
      anyOf:
        - "$ref": "#/components/schemas/Phone"
        - "$ref": "#/components/schemas/Notebook"
paths: {}
```

  </td>
</tr>
<tr>
  <td>

Example 16<br>
More complex example of a union type used in a multiple inheritance type expression

```yml
#%RAML 1.0
title: My API With Types
types:
   HasHome:
     type: object
     properties:
       homeAddress: string
   Cat:
     type: object
     properties:
       name: string
       color: string
   Dog:
     type: object
     properties:
       name: string
       fangs: string
   HomeAnimal: [ HasHome ,  Dog | Cat ]
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: My API With Types
components:
  schemas:
    HasHome:
      properties:
        homeAddress:
          type: string
      type: object
      required:
        - homeAddress
    Cat:
      properties:
        name:
          type: string
        color:
          type: string
      type: object
      required:
        - name
        - color
    Dog:
      properties:
        name:
          type: string
        fangs:
          type: string
      type: object
      required:
        - name
        - fangs
    HomeAnimal:
      allOf:
        - "$ref": "#/components/schemas/HasHome"
        - anyOf:
          - "$ref": "#/components/schemas/Dog"
          - "$ref": "#/components/schemas/Cat"
paths: {}
```

  </td>
</tr>
<tr>
  <td>

Example 17

```yml
#%RAML 1.0
title: My API With Types
types:
  types:
     HasHome:
       type: object
       properties:
         homeAddress: string
     IsOnFarm:
       type: object
       properties:
         farmName: string
     Cat:
       type: object
       properties:
         name: string
         color: string
     Dog:
       type: object
       properties:
         name: string
         fangs: string
     Parrot:
       type: object
       properties:
         name: string
         color: string
     HomeAnimal: [ HasHome | IsOnFarm ,
                   Dog | Cat | Parrot ]
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: "My API With Types"
components:
  schemas:
    HasHome:
      type: object
      properties:
      homeAddress:
        type: string
      required:
      - homeAddress
    IsOnFarm:
      type: object
      properties:
      farmName:
        type: string
      required:
      - farmName
    Cat:
      type: object
      properties:
      name:
        type: string
      color:
        type: string
      required:
      - name
      - color
    Dog:
      type: object
      properties:
      name:
        type: string
      fangs:
        type: string
      required:
      - name
      - fangs
    Parrot:
      type: object
      properties:
      name:
        type: string
      color:
        type: string
      required:
      - name
      - color
    HomeAnimal:
      allOf:
        - anyOf:
          - "$ref": "#/components/schemas/HasHome"
          - "$ref": "#/components/schemas/IsOnFarm"
        - anyOf:
          - "$ref": "#/components/schemas/Cat"
          - "$ref": "#/components/schemas/Dog"
          - "$ref": "#/components/schemas/Parrot"
paths: {}
```

  </td>
</tr>
<tr>
  <td>

Example 18

```yml
#%RAML 1.0
title: My API With Types
types:
  ErrorModel:
    type: object
    properties:
      message:
        type: string
      code:
        type: integer
        minimum: 100
        maximum: 600
  ExtendedErrorModel:
    type: ErrorModel
    properties:
       rootCause:
         type: string
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: My API With Types
components:
  schemas:
    ErrorModel:
      type: object
      required:
      - message
      - code
      properties:
        message:
          type: string
        code:
          type: integer
          minimum: 100
          maximum: 600
    ExtendedErrorModel:
      allOf:
      - $ref: '#/components/schemas/ErrorModel'
      - type: object
        properties:
          rootCause:
            type: string
        required:
        - rootCause
paths: {}
```

  </td>
</tr>
</table>

<a name="xml_json_type"></a>
#### Types defined using XML and JSON Schema

<table>
<tr>
  <td><b>RAML 1.0</td>
  <td><b>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 19
Assuming Person.json

```js
{
 "type": "object",
 "description": "Person details",
 "properties": {
   "firstName": { "type": "string" },
   "lastName": { "type": "string" },
   "nationality": { "type": "string" }
 },
 "required": [ "firstName", "lastName" ]
}
```

Assuming api definition this way

```yml
#%RAML 1.0
title: My API With Types
types:
  Person: !include Person.json
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: "My API With Types"
components:
  schemas:
    Person:
      description: "Person details"
      type: object
      properties:
        firstName:
          type: string
        lastName:
          type: string
        nationality:
          type: string
      required:
        - firstName
        - lastName
        - nationality
paths: {}
```

  </td>
</tr>
<tr>
  <td>

Example 20
Assuming Person.json

```js
{
 "type": "object",
 "description": "Person details",
 "properties": {
   "firstName": { "type": "string" },
   "lastName": { "type": "string" },
   "nationality": { "type": "string" }
 },
 "required": [ "firstName", "lastName" ]
}
```

Assuming api definition this way

```yml
#%RAML 1.0
title: My API With Types
/person:
  get:
    responses:
      200:
        body:
          application/json:
            type: !include Person.json
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: My API With Types
paths:
  /persons:
    get:
      responses:
        200:
          description: OK
          content:
            application/json:
              schema: {
                  "description": "Foo details",
                  "properties": {
                    "id": {
                      "type": "integer"
                    },
                    "name": {
                      "type": "string"
                    },
                    "ownerName": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "id",
                    "name"
                  ],
                  "type" : "object"
                }
```

  </td>
</tr>
<tr>
  <td>

Example 21
References to Inner Elements

```yml
#%RAML 1.0
title: My API With Types
types:
  Foo:
    type: !include elements.xsd#Foo
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: My API With Types
components:
  schemas:
    Foo:
      $ref: "elements.xsd#Foo"
paths: {}
```

  </td>
</tr>
</table>

<a name="user_facets"></a>
#### User-defined Facets

In RAML 1.0, in addition to the built-in facets, you can declare user-defined facets for any data type.

```yml
#%RAML 1.0
title: API with Types
types:
  CustomDate:
    type: date-only
    facets:
      onlyFutureDates?: boolean # optional  in `PossibleMeetingDate`
      noHolidays: boolean # required in `PossibleMeetingDate`
  PossibleMeetingDate:
    type: CustomDate
    noHolidays: true
```

OAS does not have a similar capability, so conversion is not possible here. <a href="#lost_sem_others">See Lost semantics.</a>

<table>
<tr>
  <td><b>RAML 1.0</td>
  <td><b>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 22

```yml
#%RAML 1.0
title: user-defined facets
version: 1
types:
  stringWithMimeType:
    type: string
    facets: #this does not maps directly to oas 3.0
      mime: string
  json:
    type: stringWithMimeType
    mime: "application/json" #this does not maps directly to oas 3.0
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: user-defined facets
paths: {}
components:
  schemas:
    stringWithMimeType:
      type: string
    json:
      $ref: '#/components/schemas/stringWithMimeType'
```

  </td>
</tr>
</table>

<a name="type_expressions"></a>
#### Type Expressions

Type expressions provide a powerful way of referring to, and even defining, types. Type expressions can be used wherever a type is expected. The simplest type expression is just the name of a type. Using type expressions, you can devise type unions, arrays, maps, and other things.

<table>
<tr>
  <td><b>Expression</td>
  <td><b>RAML example</td>
  <td><b>OAS Conversion</td>
</tr>
<tr>
  <td>Person<br>The simplest type expression: A single type</td>
  <td>

Example 23

```yml
#%RAML 1.0
title: API with Types
types:
  User:
    type: object
    properties:
      firstName: string
      lastName:  string
      age:       number
/users/{id}:
  get:
    responses:
      200:
        body:
          application/json:
            type: User
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: API with Types
  description: ''
paths:
  '/users/{id}':
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    get:
      operationId: GET_users-id
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        firstName:
          type: string
        lastName:
          type: string
        age:
          type: number
      required:
            - firstName
            - lastName
            - age

```

  </td>
</tr>
<tr>
  <td>Person[] <br> An array of Person objects</td>
  <td>

Example 24

```yml
#%RAML 1.0
title: API with types
types:
  Email:
    type: object
    properties:
      subject: string
      body: string
  EmailsLong:
    type: array
    items: Email
    minItems: 1
    uniqueItems: true
  EmailsShort:
    type: Email[]
    minItems: 1
    uniqueItems: true
/mail:
  get:
    responses:
      200:
        body:
          application/json:
            type: EmailsShort
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: API with types
paths:
  /mail:
    get:
      operationId: GET_mail
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EmailsShort'
components:
  schemas:
    Email:
      type: object
      properties:
        subject:
          type: string
        body:
          type: string
      required:
        - subject
        - body
    EmailsLong:
      type: array
      uniqueItems: true
      items:
        $ref: '#/components/schemas/Email'
      minItems: 1
    EmailsShort:
      type: array
      uniqueItems: true
      minItems: 1
      items:
        $ref: '#/components/schemas/Email'
```

  </td>
</tr>
<tr>
  <td>string[]<br>An array of string scalars</td>
  <td>

Example 25

```yml
#%RAML 1.0
title: API with types
types:
  StringArray:
  # normal array of strings type declaration
    type: array
    items: string
  IntegerArray:
  # array of integer type declaration
    type: integer[]
    minItems: 1
    uniqueItems: true
  DateArray:
  # array type declaration using
  # type expression shortcut
    type: date-only[]
    example:
      - 2015-05-23
      - 2015-05-19
/mail:
  get:
    responses:
      200:
        body:
          application/json:
            type: DateArray
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: '1.0'
  title: API with types
  description: ''
paths:
  /mail:
    get:
      operationId: GET_mail
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DateArray'
components:
  schemas:
    StringArray:
      type: array
      items:
        type: string
    IntegerArray:
      type: array
      uniqueItems: true
      minItems: 1
      items:
        type: integer
    DateArray:
      type: array
      example:
        - '2015-05-23'
        - '2015-05-19'
      items:
        type: string
        format: date
```

</td>
</tr>
<tr>
  <td>string[][]<br>A bi-dimensional array of string scalars</td>
  <td>

Example 25.1

```yml
#%RAML 1.0
title: API with types
types:
  StringArray:
  # normal array of strings
  # type declaration
    type: array
    items: string
  IntegerArray:
  # array of integer type declaration
    type: integer[][]
  DateArray:
  # array type declaration using
  # type expression shortcut
    type: date-only[]
    example:
      - 2015-05-23
      - 2015-05-19
/mail:
  get:
    responses:
      200:
        body:
          application/json:
            type: IntegerArray
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: API with types
  description: ''
paths:
  /mail:
    get:
      operationId: GET_mail
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/IntegerArray'
components:
  schemas:
    StringArray:
      type: array
      items:
        type: string
    IntegerArray:
      type: array
      items:
        type: array
        items:
          type: integer
    DateArray:
      type: array
      example:
        - '2015-05-23'
        - '2015-05-19'
      items:
        type: string
        format: date
```

  </td>
</tr>
<tr>
  <td>string | Person <br> A union type made of members of string OR Person</td>
  <td>

```yml
#%RAML 1.0
title: API with types
types:
  UnionType:
    type: string | Person
  Person:
      type: object
/union:
  get:
    responses:
      200:
        body:
          application/json:
            type: UnionType
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: API with types
  description: ''
paths:
  /union:
    get:
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UnionType'
components:
  schemas:
    UnionType:
      anyOf:
        - type: string
        - $ref: '#/components/schemas/Person'
    Person:
      type: object
```

  </td>
</tr>
<tr>
  <td>(string | Person)[] <br> An array of the type shown above</td>
  <td>

```yml
#%RAML 1.0
title: API with types
types:
  UnionArray:
    type: (string | Person)[]
  Person:
      type: object
/union:
  get:
    responses:
      200:
        body:
          application/json:
            type: UnionArray
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: API with types
  description: ''
paths:
  /union:
    get:
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UnionArray'
components:
  schemas:
    UnionArray:
      type: array
      items:
        anyOf:
          - type: string
          - $ref: '#/components/schemas/Person'
    Person:
      type: object
```

  </td>
</tr>
</table>

<a name="inline_declarations"></a>
#### Inline Type Declarations

You can declare inline/anonymous types everywhere a type can be referenced except in a Type Expression.

<table>
<tr>
  <td><b>RAML 1.0</td>
  <td><b>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 26

```yml
#%RAML 1.0
title: My API With Types
/users/{id}:
  get:
    responses:
      200:
        body:
          application/json:
            type: object
            properties:
              firstname:
                type: string
              lastname:
                type: string
              age:
                type: number
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: My API With Types
paths:
  '/users/{id}':
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    get:
      operationId: GET_users-id
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                properties:
                  firstname:
                    type: string
                  lastname:
                    type: string
                  age:
                    type: number
```

  </td>
</tr>
</table>

<a name="xml"></a>
### XML Serialization of Type Instances

A RAML 1.0 xml node maps to OAS 3.0 xml node this way:

<table>
  <tr>
    <td><b>RAML 1.0 Field Name</td>
    <td><b>OAS 3.0 Field Name</td>
  </tr>
  <tr>
    <td>attribute?</td>
    <td>attribute</td>
  </tr>
  <tr>
    <td>wrapped?</td>
    <td>wrapped</td>
  </tr>
  <tr>
    <td>name?</td>
    <td>name</td>
  </tr>
  <tr>
    <td>namespace?</td>
    <td>namespace</td>
  </tr>
  <tr>
    <td>prefix?</td>
    <td>prefix</td>
  </tr>
</table>


<table>
<tr>
  <td><b>RAML 1.0</td>
  <td><b>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 27

```yml
#%RAML 1.0
title: API Platform V2 API
types:
  Person:
    properties:
      name:
        type: string
        xml:
          attribute: true
              # serialize it as an XML attribute
          name: "fullname"
             # attribute should be called fullname
      addresses:
        type: Address[]
        xml:
          wrapped: true
            # serialize it into its own
            # <addresses>...</addresses> XML element
  Address:
    properties:
      street: string
      city: string
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: API Platform V2 API
components:
  schemas:
    Person:
      properties:
        name:
          type: string
          xml:
            attribute: true
            name: fullname
        addresses:
          type: array
          xml:
            wrapped: true
          items:
            $ref: '#/components/schemas/Address'
      type: object
      required:
        - name
        - addresses
    Address:
      properties:
        street:
          type: string
        city:
          type: string
      type: object
      required:
        - street
        - city
paths: {}
```

  </td>
</tr>
</table>

<a name="resources"></a>
## Resources and Nested Resources

A resource is identified by its relative URI. It is converted to OAS as a path.

<table>
  <tr>
    <td><b>RAML 1.0 Field Name</td>
    <td><b>OAS 3.0 Field Name</td>
  </tr>
  <tr>
    <td>displayName?</td>
    <td>No conversion to OAS.<br><a href="#lost_sem_others">Lost semantics.</a></td>
  </tr>
  <tr>
    <td>description?</td>
    <td>No conversion to OAS.<br><a href="#lost_sem_others">Lost semantics.</a></td>
  </tr>
  <tr>
    <td>(annotationName)?</td>
    <td>x-annotation-annotationName vendor extension<br><a href="#annotations">See Annotations mappings.</a></td>
  </tr>
  <tr>
    <td> get? <br> patch? <br> put? <br> post? <br> delete? <br> options? <br> head?</td>
    <td> get  <br> patch  <br> put  <br> post  <br> delete  <br> options  <br> head </td>
  </tr>
  <tr>
    <td>is?</td>
    <td>No conversion to OAS. <br><a href="#lost_sem_others">Lost semantics.</a></td>
  </tr>
  <tr>
    <td>type?</td>
    <td>$ref, reference to schemas created as consequence of resource type conversion.<br><a href="#lost_sem_others">Lost semantics.</a></td>
  </tr>
  <tr>
    <td>securedBy?</td>
    <td>Security definitions that apply to all methods in the path; consequently, definitions will be converted to a OAS security declaration for each method. This might be redefined at the method level.<br><a href="#security_schemes">See Security Schemes mappings.</a></td>
  </tr>
  <tr>
    <td>uriParameters?</td>
    <td>parameters. path type</td>
  </tr>
</table>

<a name="methods"></a>
## Methods

RESTful API methods are operations that are performed on a resource. Methods have properties that match OAS Operation Object attributes that are converted as follows:

<table>
  <tr>
    <td><b>RAML 1.0 Field Name</td>
    <td><b>OAS 3.0 Field Name</td>
  </tr>
  <tr>
    <td>displayName?</td>
    <td>operationId</td>
  </tr>
  <tr>
    <td>description?</td>
    <td>description</td>
  </tr>
  <tr>
    <td>(annotationName)?</td>
    <td>x-annotation-annotationName vendor extension<br><a href="#annotations">See Annotations mappings.</a></td>
  </tr>
  <tr>
    <td>queryParameters?</td>
    <td>parameters. in: query.<br>Examples at <a href="#query_params">Query parameters section.</a></td>
  </tr>
  <tr>
    <td>headers?</td>
    <td>parameters. in: header <br>Examples at <a href="#headers">Headers section.</a></td>
  </tr>
  <tr>
    <td>queryString?</td>
    <td>parameters. in: query. </td>
  </tr>
  <tr>
    <td>responses?</td>
    <td>responses.<br>Examples at <a href="#responses">Responses section.</a>.</td>
  </tr>
  <tr>
    <td>body?</td>
    <td>requestBody<br>Examples at <a href="#bodies">Bodies section.</a></td>
  </tr>
  <tr>
    <td>protocols?</td>
    <td>No conversion to OAS.<br><a href="#lost_sem_others">Lost semantics.</a></td>
  </tr>
  <tr>
    <td>is?</td>
    <td>No conversion to OAS.<br><a href="#lost_sem_others">Lost semantics.</a>
</td>
  </tr>
  <tr>
    <td>securedBy?</td>
    <td>security. The security schemes that apply to this method.</td>
  </tr>
</table>

<a name="headers"></a>
### **Headers**

<table>
<tr>
  <td><B>RAML 1.0</td>
  <td><B>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 28

```yml
#%RAML 1.0
title: headers example
version: 1
/jobs:
 post:
   description: Create a job
   headers:
     Zencoder-Api-Key:
       description: The API key needed to
                    create a new job
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: '1'
  title: headers example
paths:
  /jobs:
    post:
      operationId: POST_jobs
      description: Create a job
      parameters:
        - name: Zencoder-Api-Key
          in: header
          description: The API key needed to create a new job
          required: true
          schema:
            type: string
      responses:
        default:
          description: ''
```

  </td>
</tr>
<tr>
  <td>

Example 29

```yml
#%RAML 1.0
title: headers example
version: 1
/jobs2:
 get:
   headers:
     X-Dept:
       type: array
       description: |
         A department code to be charged.
         Multiple of such headers are allowed.
       items:
         pattern: ^\d+\-\w+$
         example: 230-OCTO
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
 version: "1"
 title: "headers example"
paths:
 "/jobs2":
  get:
   operationId: GET_jobs2
   parameters:
    - name: "X-Dept"
      in: header
      description: A department code to be charged.
            Multiple of such headers are allowed
      required: true
      schema:
        type: array
        items:
          type: string
   responses:
    default:
     description: ""
```
  </td>
</tr>
</table>

<a name="query_params"></a>
### **Query Strings and Query Parameters**

<table>
  <tr>
    <td><b>RAML 1.0</td>
    <td><b>OAS 3.0 Conversion</td>
  </tr>
  <tr>
    <td>

Example 30

```yml
#%RAML 1.0
title: GitHub API
/users:
  get:
    description: Get a list of users
    queryParameters:
      page:
        description: Specify the page that you want to retrieve
        type:        integer
        required:    true
        example:     1
      per_page:
        description: Specify the amount of items that will be retrieved per page
        type:        integer
        minimum:     10
        maximum:     200
        default:     30
        example:     50
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: GitHub API
paths:
  /users:
    get:
      operationId: GET_users
      description: Get a list of users
      parameters:
        - name: page
          in: query
          description: Specify the page that you
                       want to retrieve
          required: true
          schema:
            type: integer
        - name: per_page
          in: query
          description: Specify the amount of items that
                       will be retrieved per page
          required: true
          schema:
            type: integer
            default: 30
            minimum: 10
            maximum: 200
      responses:
        default:
          description: ''
```

  </td>
</tr>
</table>

<a name="bodies"></a>
### **Bodies**

<table>
<tr>
  <td><b>RAML 1.0</td>
  <td><b>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 31

```yml
#%RAML 1.0
title: Example of request bodies
mediaType: application/json
types:
  User:
    properties:
      firstName:
      lastName:
/users:
  post:
    body:
      type: User
/groups:
  post:
    body:
      application/json:
        properties:
          groupName:
          deptCode:
            type: number
      text/xml:
        type: !include schemas/group.xsd
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
 version: ''
 title: Example of request bodies
paths:
  /users:
    post:
      operationId: POST_users
      requestBody:
        description: ''
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      responses:
        default:
          description: ''
  /groups:
    post:
      operationId: POST_groups
      requestBody:
        description: ''
        required: true
        content:
          text/xml:
            schema:
              $ref: "schemas/group.xsd#" # this may be wrong
          application/json:
            schema:
              type: object
      responses:
        default:
          description: ''
components:
  schemas:
    User:
      properties:
        firstName:
          type: string
        lastName:
          type: string
      type: object
      required:
        - firstName
        - lastName
```

  </td>
</tr>
</table>

<a name="responses"></a>
### **Responses**

<table>
  <tr>
    <td><b>RAML 1.0 Field Name</td>
    <td><b>OAS 3.0 Field Name</td>
  </tr>
  <tr>
    <td>description?</td>
    <td>description</td>
  </tr>
  <tr>
    <td>(annotationName)</td>
    <td>x-annotation-annotationName vendor extension<br><a href="#annotations">See Annotations mappings.</a>
   </td>
  </tr>
  <tr>
    <td>headers?</td>
    <td>headers</td>
  </tr>
  <tr>
    <td>body?</td>
    <td>body</td>
  </tr>
</table>

<a name="security_schemes"></a>
## **Security Schemes**

Security Schemes are converted to OAS as Security Schemes. RAML supports the following built-in security scheme types that are converted as follows:

<table>
  <tr>
    <td><b>RAML 1.0 Type</td>
    <td><b>OAS 3.0 Type</td>
  </tr>
  <tr>
    <td>OAuth 1.0</td>
    <td>oauth</td>
  </tr>
  <tr>
    <td>OAuth 2.0</td>
    <td>oauth2</td>
  </tr>
  <tr>
    <td>Basic Authentication</td>
    <td>basic</td>
  </tr>
  <tr>
    <td>Digest Authentication</td>
    <td>digest</td>
  </tr>
  <tr>
    <td>Pass Through</td>
    <td>apiKey</td>
  </tr>
  <tr>
    <td>x-{other}</td>
    <td>Custom security definition. x-schemeName</td>
  </tr>
</table>

<table>
  <tr>
    <td><b>RAML 1.0 Field Name</td>
    <td></td>
    <td><b>OAS 3.0 Field Name
</td>
  </tr>
  <tr>
    <td>type</td>
    <td></td>
    <td>type</td>
  </tr>
  <tr>
    <td>displayName?</td>
    <td></td>
    <td>No conversion to OAS<br><a href="#lost_sem_others">Lost semantics.</a></td>
  </tr>
  <tr>
    <td>description?</td>
    <td></td>
    <td>description</td>
  </tr>
  <tr>
    <td>describedBy? Depending on type</td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>OAuth2.0</td>
    <td>headers<br>queryParameters<br>responses</td>
    <td>No conversion to OAS<br><a href="#lost_sem_others">Lost semantics.</a>
    </td>
  </tr>
  <tr>
    <td>Pass Through</td>
    <td>headers<br>queryParameters</td>
    <td>in: header</td>
  </tr>
  <tr>
    <td>x-other</td>
    <td>headers<br>queryParameters</td>
    <td>in:header</td>
  </tr>
  <tr>
    <td>settings? Depending on type</td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>OAuth1.0</td>
    <td>requestTokenUri<br>authorizationUri<br>tokenCredentialsUri<br>signatures</td>
    <td>No conversion to OAS.<br><a href="#lost_sem_others">Lost semantics.</a></td>
  </tr>
  <tr>
    <td>OAuth2.0</td>
    <td>authorizationUri<br>accessTokenUri<br>authorizationGrants<br>scopes</td>
    <td>authorizationUrl<br>tokenUrl<br>flow<br>scopes</td>
  </tr>
  <tr>
    <td>Basic Authentication</td>
    <td>Not Applicable</td>
    <td>Not Applicable</td>
  </tr>
  <tr>
    <td>Digest Authentication</td>
    <td>Not Applicable</td>
    <td>Not Applicable</td>
  </tr>
  <tr>
    <td>Pass Through</td>
    <td>Not Applicable</td>
    <td>Not Applicable</td>
  </tr>
</table>

<a name="examples"></a>
## Examples

RAML supports either the definition of multiple examples or a single one for any given instance of a type declaration.

<a name="multi_examples"></a>
#### Multiple Examples

Multiples named examples are supported</a>

<a name="single_example"></a>
#### Single Example

Value faces and annotations will be used to map to an OAS example node when possible. See <a href="#lost_sem_others">Lost semantics.</a>


<table>
<tr>
  <td><b>RAML 1.0</td>
  <td><b>OAS 3.0 conversion</td>
</tr>
<tr>
  <td>

Example 36

```yml
#%RAML 1.0
title: API with Examples
types:
  User:
    type: object
    properties:
      name: string
      lastname: string
    example:
      name: Bob
      lastname: Marley
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: API with Examples
components:
  schemas:
    User:
      type: object
      example:
        name: Bob
        lastname: Marley
      properties:
        name:
          type: string
        lastname:
          type: string
      required:
        - name
        - lastname
paths: {}
```

  </td>
</tr>
<tr>
  <td>

Example 37

```yml
#%RAML 1.0
title: API with Examples
types:
  User:
    type: object
    properties:
      name: string
      lastname: string
    examples:
      one:
        name: Bob
        lastname: Marley
      two:
        name: Paul
        lastname: Newman
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: API with Examples
paths: {}
components:
  schemas:
    User:
      type: object
      properties:
        name:
          type: string
        lastname:
          type: string
      required:
        - name
        - lastname
      example:
        one:
          name: Bob
          lastname: Marley
        two:
          name: Paul
          lastname: Newman
```

  </td>
</tr>
<tr>
  <td>

Example 38

```yml
#%RAML 1.0
title: API with Examples
types:
  User:
    type: object
    properties:
      name: string
      lastname: string
    example:
      name: Bob
      lastname: Marley
  Org:
    type: object
    properties:
      name: string
      address?: string
      value? : string
/organisation:
  post:
    headers:
      UserID:
        description: the identifier for the user
          that posts a new organisation
        type: string
        example: SWED-123 # single scalar example
    body:
      application/json:
        type: Org
        example: # single request body example
          value: # needs to be declared since type contains 'value' property
            name: Doe Enterprise
            value: Silver
  get:
    description: Returns an organisation entity.
    responses:
      201:
        body:
          application/json:
            type: Org
            examples:
              acme:
                name: Acme
              softwareCorp:
                value: # validate against the available facets for the map value of an example
                  name: Software Corp
                  address: 35 Central Street
                  value: Gold # validate against instance of the `value` property
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ""
  title: "API with Examples"
paths:
  "/organisation":
    get:
      operationId: GET_organisation
      description: "Returns an organisation entity."
      responses:
        201:
          description: ""
          content:
            application/json:
              schema:
                "$ref": "#/components/schemas/Org"
    post:
      operationId: POST_organisation
      requestBody:
        description: ''
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Org"
      parameters:
        - name: UserID
          in: header
          description: "the identifier for the user that posts a new organisation"
          required: true
          schema:
            type: string
      responses:
        default:
          description: ""
components:
  schemas:
    User:
      type: object
      example:
        name: Bob
        lastname: Marley
      properties:
        name:
          type: string
        lastname:
          type: string
      required:
        - name
        - lastname
    Org:
      type: object
      properties:
        name:
          type: string
        address:
          type: string
        value:
          type: string
      required:
        - name
```

  </td>
</tr>
<tr>
  <td>

Example 39

```yml
#%RAML 1.0
title: Using strict=false API
/person:
  get:
    queryParameters:
      sort?:
        type: string[]
        example:
          strict: false
          value: ?sort=givenName&sort=surname,asc
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: Using strict=false API
paths:
  /person:
    get:
      operationId: GET_person
      parameters:
        - name: sort
          in: query
          required: false
          schema:
            type: array
            items:
              type: string
      responses:
        default:
          description: ''
```

  </td>
</tr>
</table>

<a name="annotations"></a>
## **Annotations**

Annotations will be mapped into vendor extensions, with the following naming standard:

(annotationName) will be converted as x-annotation-annotationName

If an annotation with the form of (oas-name) is present at the RAML document, they will be ignored by Export process. This kind of annotations were created by a previous  OAS → RAML conversion and current version of Converter is not using those values to bring back original nodes. (<a href="#lost_sem_others">Lost semantics.</a>)


<a name="lost_semantics"></a>
## **Lost semantics between translations**

Although both specifications (OAS 3.0 and RAML 1.0) have various aspects in common, RAML includes features that do not have an equivalent in OAS. So, when converting from a RAML document to OAS document some decisions are taken in order to deal with non-supported features. The following section describes RAML 1.0 concepts that will be lost or how concept differences are mapped to convert a RAML 1.0 document into OAS 3.0.

<a name="lost_sem_traits"></a>
### Traits and Resource Types

There are many advantages of reusing patterns across multiple resources and methods.

Traits and resource types are the tools that RAML provides to enable reuse and standardization.

A trait, like a method, can provide method-level nodes such as description, headers, query string parameters, and responses. OAS has a similar, but not exact concept: global parameters and global responses. When reuse is possible, traits are resolved as follows:

* Traits of header and the queryParameters type are mapped to OAS global parameters.
* Traits of response type are mapped to OAS global responses.
* QueryParameter traits of multiple attributes are split into several global parameters.

There are corner cases where it is not possible to map to reusable components. When this is the scenario, trait definitions are used to create a parameters or responses at the method level.

<table>
<tr>
  <td><b>RAML 1.0 example </td>
  <td><b>OAS 3.0 Conversion</td>
</tr>
<tr>
  <td>

Example 32

```yml
#%RAML 1.0
title: traits example
traits:
  imageable:
      queryParameters:
        imageType:
          description: Comma ,
             separated list just like in
             example. One alone may be present
          type: string
          required: false
          default: SmallImage
          example:
           TinyImage,SwatchImage,
           SmallImage,MediumImage,
           LargeImage
/items:
   get:
      is: [imageable]
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: traits example
components:
  parameters:
    trait-imageable-imageType:
      name: imageType
      in: query
      description: 'Comma , separated list just like in example. One alone may be present'
      required: false
      schema:
        type: string
        default: SmallImage
paths:
  /items:
    get:
      operationId: GET_items
      parameters:
        - $ref: '#/components/parameters/trait-imageable-imageType'
      responses:
        default:
          description: ''
```

  </td>
</tr>
<tr>
  <td>

Example 33

```yml
#%RAML 1.0
title: traits example
traits:
  searchable:
    queryParameters:
      name:
        type: string
        required: false
        example: Deep Steep Honey Bubble Bath
      type:
        type: string
        required: false
        example: Oils
      brand:
        type: string
        required: false
        example: Naturtint
/items:
   get:
      is: [searchable]
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: traits example
components:
  parameters:
    trait-searchable-name:
      name: name
      in: query
      required: false
      schema:
        type: string
    trait-searchable-type:
      name: type
      in: query
      required: false
      schema:
        type: string
    trait-searchable-brand:
      name: brand
      in: query
      required: false
      schema:
        type: string
paths:
  /items:
    get:
      operationId: GET_items
      parameters:
        - $ref: '#/components/parameters/trait-searchable-name'
        - $ref: '#/components/parameters/trait-searchable-type'
        - $ref: '#/components/parameters/trait-searchable-brand'
      responses:
        default:
          description: ''
```

  </td>
</tr>
<tr>
  <td>

Example 34

```yml
#%RAML 1.0
title: traits example
traits:
  imageable:
      queryParameters:
        imageType:
          description: Comma ,
             separated list just like in
             example. One alone may be present
          type: string
          required: false
          default: SmallImage
          example:
           TinyImage,SwatchImage,
           SmallImage,MediumImage,
           LargeImage
   accessToken:
     headers:
       token:
         description: access token
         type: string
         example: password
/items:
   get:
      is: [imageable,accessToken]
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: traits example
components:
  parameters:
    trait-imageable-imageType:
      name: imageType
      in: query
      description: 'Comma , separated list just
            like in example. One alone may be present'
      required: false
      schema:
        type: string
        default: SmallImage
    trait-accessToken-token:
      name: token
      in: header
      description: access token
      required: false
      schema:
        type: string
paths:
  /items:
    get:
      operationId: GET_items
      parameters:
        - $ref: '#/components/parameters/trait-imageable-imageType'
        - $ref: '#/components/parameters/trait-accessToken-token'
      responses:
        default:
          description: ''
```

  </td>
</tr>
<tr>
  <td>

Example 35

```yml
#%RAML 1.0
title: traits example
traits:
  imageable:
      queryParameters:
        imageType:
          description: Comma ,
             separated list just like in
             example. One alone may be present
          type: string
          required: false
          default: SmallImage
          example:
            TinyImage,SwatchImage,
            SmallImage,MediumImage,
            LargeImage
   accessToken:
     headers:
       token:
         description: access token
         type: string
         example: password
   hasFound:
     responses:
      200:
        body:
          application/json:
          type: Item
/items:
   get:
      is: [imageable,accessToken]
```

  </td>
  <td>

```yml
openapi: 3.0.0
info:
  version: ''
  title: traits example
components:
  parameters:
    trait-imageable-imageType:
      name: imageType
      in: query
      description: 'Comma , separated list just
            like in example. One alone may be present'
      required: false
      schema:
        type: string
        default: SmallImage
    trait-accessToken-token:
      name: token
      in: header
      description: access token
      required: false
      schema:
        type: string
  responses:
    trait-hasFound-200:
      description: ''
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Item' #missing in this example
paths:
  /prueba:
    get:
      operationId: GET_prueba
      parameters:
        - $ref: '#/components/parameters/trait-imageable-imageType'
        - $ref: '#/components/parameters/trait-accessToken-token'
      responses:
        '200':
          $ref: '#/components/responses/trait-hasFound-200'
```

  </td>
</tr>
</table>


Besides traits, defining resource types helps reusing patterns across multiple resources. A resource type, like a resource, can specify security schemes, methods, and other nodes. A resource that uses a resource type inherits its nodes. A resource type can also use, and thus inherit from, another resource type. Resource types and resources are related through an inheritance chain pattern.

When exporting to OAS, resource type schemas cannot be mapped directly since this semantic is lost. Nevertheless, they are resolved through expansion in the form of paths, parameters or responses.

<a name="lost_sem_libraries"></a>
### Libraries

Will be not really mapped. The conversion should work on the expanded tree. Any library information is lost since one single file with library and root raml information will be generated.

<a name="lost_sem_overlays_extensions"></a>
### Overlays and extensions

Overlays and extensions are not actually be mapped to anything. When converting - overlays and extensions should have been applied by the parser already.

<a name="lost_sem_others"></a>
### Others

* documentation
* annotationTypes
* uses
* displayName (?)
* annotations (if created during OAS-->RAML conversion. Converter does not yet reuse those annotations to bring back the original nodes.)
* pattern when used to validate additionalProperties names
* format in some scenarios (when converting date types)
* file type facets: fileTypes
* file type facets: minLength ( TODO: really?)
* file type facets: maxLength ( TODO: really?)
* discriminatorValue
* custom facets
* resource description
* protocols
* traits usage at method or resource level
* example for nodes where example is not supported. Example specific facets are not supported either.
* references to inner elements of xml schemas
* RAML original body when there are different definitions for different mediatypes