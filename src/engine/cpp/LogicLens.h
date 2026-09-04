#ifndef LOGICLENS_H
#define LOGICLENS_H

#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <unordered_map>
#include <map>
#include <set>
#include <unordered_set>

// Helper to escape strings
inline std::string __ll_escape(const std::string& str) {
    std::string result;
    for (char c : str) {
        if (c == '"') result += "\\\"";
        else if (c == '\\') result += "\\\\";
        else if (c == '\n') result += "\\n";
        else if (c == '\r') result += "\\r";
        else if (c == '\t') result += "\\t";
        else result += c;
    }
    return result;
}

#include <type_traits>

// SFINAE check for operator<<
template <typename T, typename = void>
struct has_ostream_operator : std::false_type {};

template <typename T>
struct has_ostream_operator<T, std::void_t<decltype(std::declval<std::ostream&>() << std::declval<T>())>> : std::true_type {};

// Convert various types to JSON string representation (for types WITH operator<<)
template <typename T>
inline typename std::enable_if<has_ostream_operator<T>::value, std::string>::type 
__ll_to_json(const T& val) {
    std::stringstream ss;
    ss << val;
    return ss.str();
}

// Fallback for types WITHOUT operator<< (e.g., custom structs/classes)
template <typename T>
inline typename std::enable_if<!has_ostream_operator<T>::value, std::string>::type 
__ll_to_json(const T& val) {
    return "\"[Object]\"";
}

template <>
inline std::string __ll_to_json(const std::string& val) {
    return "\"" + __ll_escape(val) + "\"";
}

template <>
inline std::string __ll_to_json(const char* const& val) {
    return "\"" + __ll_escape(std::string(val)) + "\"";
}

template <>
inline std::string __ll_to_json(const bool& val) {
    return val ? "true" : "false";
}

template <typename T>
inline std::string __ll_to_json(const std::vector<T>& val) {
    std::string res = "[";
    for (size_t i = 0; i < val.size(); ++i) {
        res += __ll_to_json(val[i]);
        if (i < val.size() - 1) res += ", ";
    }
    res += "]";
    return res;
}

// Event formatters
template <typename T>
inline void __ll_set_var(const std::string& name, const T& value) {
    std::cout << "{\"type\": \"VARIABLE_UPDATE\", \"variable\": \"" << name << "\", \"value\": " << __ll_to_json(value) << "}\n" << std::flush;
}

inline void __ll_block_enter(const std::string& blockType, const std::string& blockLabel = "") {
    std::cout << "{\"type\": \"BLOCK_ENTER\", \"blockType\": \"" << blockType << "\", \"blockLabel\": \"" << blockLabel << "\"}\n" << std::flush;
}

inline void __ll_block_exit() {
    std::cout << "{\"type\": \"BLOCK_EXIT\"}\n" << std::flush;
}

template <typename T>
inline void __ll_array_access(const std::string& name, const T& index) {
    std::cout << "{\"type\": \"ARRAY_ACCESS\", \"array\": \"" << name << "\", \"index\": " << index << "}\n" << std::flush;
}

template <typename T, typename U>
inline void __ll_array_write(const std::string& name, const T& index, const U& value) {
    std::cout << "{\"type\": \"ARRAY_WRITE\", \"array\": \"" << name << "\", \"index\": " << index << ", \"value\": " << __ll_to_json(value) << "}\n" << std::flush;
}

template <typename K, typename V>
inline void __ll_map_insert(const std::string& name, const K& key, const V& value) {
    std::cout << "{\"type\": \"MAP_INSERT\", \"map\": \"" << name << "\", \"key\": " << __ll_to_json(key) << ", \"value\": " << __ll_to_json(value) << "}\n" << std::flush;
}

template <typename K>
inline void __ll_map_lookup(const std::string& name, const K& key) {
    std::cout << "{\"type\": \"MAP_LOOKUP\", \"map\": \"" << name << "\", \"key\": " << __ll_to_json(key) << "}\n" << std::flush;
}

inline void __ll_note(const std::string& message) {
    std::cout << "{\"type\": \"ANNOTATION\", \"message\": \"" << __ll_escape(message) << "\"}\n" << std::flush;
}

#endif
