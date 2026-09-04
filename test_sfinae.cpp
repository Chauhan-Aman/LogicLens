#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <type_traits>

template <typename T, typename = void>
struct has_ostream_operator : std::false_type {};

template <typename T>
struct has_ostream_operator<T, std::void_t<decltype(std::declval<std::ostream&>() << std::declval<T>())>> : std::true_type {};

template <typename T>
inline typename std::enable_if<has_ostream_operator<T>::value, std::string>::type 
__ll_to_json(const T& val) {
    return "Primitive";
}

template <typename T>
inline typename std::enable_if<!has_ostream_operator<T>::value, std::string>::type 
__ll_to_json(const T& val) {
    return "\"[Object]\"";
}

template <typename T>
inline std::string __ll_to_json(const std::vector<T>& val) {
    return "Vector";
}

int main() {
    std::vector<int> v;
    std::cout << __ll_to_json(v) << std::endl;
    return 0;
}
